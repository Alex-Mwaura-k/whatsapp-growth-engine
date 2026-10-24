import re
import hmac
import hashlib
import datetime
import logging
from decimal import Decimal
from urllib.parse import urlsplit
from uuid import UUID
from django.conf import settings
from django.db import transaction
from django.utils import timezone
from django.contrib.auth import get_user_model

from accounts.models import TokenTransaction
from payments.models import MpesaTransaction
from payments.mpesa import MpesaClient
from matchmaker.models import QueueRequest, MatchBatch, UnlockedContact
from matchmaker.services import (
    get_queue_request_pricing_phase,
    DownloadCheckoutEngine,
)

User = get_user_model()
logger = logging.getLogger('security.audit')


SAFARICOM_RESULT_MESSAGES = {
    0: "Payment confirmed successfully!",
    1: "Insufficient M-Pesa balance. Please top up and try again.",
    1001: "Another M-Pesa transaction is currently in progress on your phone.",
    1032: "Transaction was cancelled on your phone.",
    1037: "Payment prompt timed out or phone was unreachable.",
    2001: "Incorrect M-Pesa PIN entered. Please try again.",
}


def generate_callback_token(user_id, batch_id):
    """
    Generates an HMAC SHA-256 signature token to authenticate callbacks from Safaricom.
    """
    secret = str(settings.SECRET_KEY).encode('utf-8')
    message = f"{user_id}:{batch_id}".encode('utf-8')
    return hmac.new(secret, message, hashlib.sha256).hexdigest()


def format_phone_for_daraja(phone):
    if not phone:
        return ""
    digits = ''.join(filter(str.isdigit, str(phone)))
    if digits.startswith('0'):
        digits = '254' + digits[1:]
    elif digits.startswith('254'):
        pass
    elif len(digits) == 9 and (digits.startswith('7') or digits.startswith('1')):
        digits = '254' + digits
    return digits


@transaction.atomic
def initiate_batch_stk_push(user, phone_number, batch_id, target_size=20):
    user = User.objects.select_for_update().get(pk=user.pk)
    formatted_phone = format_phone_for_daraja(phone_number)

    if not re.match(r'^254[71]\d{8}$', formatted_phone):
        return {
            "success": False,
            "message": "Please enter a valid Safaricom phone number (e.g., 0712345678 or 0112345678)."
        }

    try:
        batch_uuid = UUID(str(batch_id))
    except (TypeError, ValueError, AttributeError):
        batch_uuid = None

    queue_req = None
    if batch_uuid:
        queue_req = QueueRequest.objects.filter(
            user=user,
            batch__batch_id=batch_uuid,
            status__in=['matched', 'completed'],
        ).select_related('batch').first()
    if not queue_req and str(batch_id).isdigit():
        numeric_batch_id = int(batch_id)
        queue_req = QueueRequest.objects.filter(
            user=user,
            pk=numeric_batch_id,
            status__in=['matched', 'completed'],
        ).select_related('batch').first()
        if not queue_req:
            queue_req = QueueRequest.objects.filter(
                user=user,
                batch__id=numeric_batch_id,
                status__in=['matched', 'completed'],
            ).select_related('batch').first()

    if not queue_req or not queue_req.batch:
        return {
            "success": False,
            "message": "A matched contact batch belonging to your account is required."
        }

    canonical_batch_id = str(queue_req.batch.batch_id)

    completed_tx = MpesaTransaction.objects.filter(
        user=user, 
        target_batch_id=canonical_batch_id, 
        status='COMPLETED'
    ).first()

    if completed_tx:
        return {
            "success": True,
            "is_already_unlocked": True,
            "is_free_or_token_covered": True,
            "message": "This batch is already unlocked! Starting download..."
        }

    two_minutes_ago = timezone.now() - datetime.timedelta(seconds=120)
    MpesaTransaction.objects.filter(
        user=user,
        target_batch_id=canonical_batch_id,
        status='PENDING',
        created_at__lt=two_minutes_ago
    ).update(
        status='CANCELLED',
        result_desc='Expired - Superseded by new payment attempt'
    )

    pending_tx = MpesaTransaction.objects.filter(
        user=user,
        target_batch_id=canonical_batch_id,
        status='PENDING',
        created_at__gte=two_minutes_ago
    ).first()

    phase = get_queue_request_pricing_phase(queue_req)
    pool_type = queue_req.type if queue_req else 'normal'
    actual_target = (queue_req.target_size - 1) if (queue_req and queue_req.target_size) else target_size

    breakdown = DownloadCheckoutEngine.calculate_checkout_breakdown(
        user=user, 
        current_phase=phase, 
        target_size=actual_target,
        pool_type=pool_type
    )

    if pending_tx:
        return {
            "success": True,
            "is_free_or_token_covered": False,
            "checkout_request_id": pending_tx.checkout_request_id,
            "transaction_id": pending_tx.id,
            "breakdown": breakdown,
            "is_mock": False,
            "message": "A payment prompt is already pending on your phone. Please enter your PIN."
        }

    net_cash = Decimal(str(breakdown['net_cash_required']))
    tokens_used = breakdown['tokens_used']

    if net_cash == Decimal('0.00'):
        DownloadCheckoutEngine.finalize_vcf_unlock(
            user=user, 
            checkout_breakdown=breakdown, 
            payment_reference="TOKEN_FULL_COVERAGE"
        )
        
        if queue_req:
            queue_req.status = 'completed'
            queue_req.save(update_fields=['status'])
        
        return {
            "success": True,
            "is_already_unlocked": True,
            "is_free_or_token_covered": True,
            "net_cash_required": 0.0,
            "tokens_used": tokens_used,
            "breakdown": breakdown,
            "message": "100% covered by referral tokens or free tier."
        }

    # Require the local ngrok HTTPS URL so Daraja can reach the callback endpoint.
    base_callback_url = getattr(settings, 'MPESA_CALLBACK_URL', '').strip()
    if not getattr(settings, 'MPESA_MOCK_MODE', False):
        parsed_callback_url = urlsplit(base_callback_url)
        if (
            parsed_callback_url.scheme != 'https'
            or not parsed_callback_url.netloc
            or not parsed_callback_url.path
            or parsed_callback_url.username
            or parsed_callback_url.password
            or parsed_callback_url.fragment
        ):
            return {
                "success": False,
                "message": "Configure MPESA_CALLBACK_URL as the public HTTPS callback URL for your ngrok tunnel."
            }

    security_token = generate_callback_token(user.id, canonical_batch_id)
    delimiter = '&' if '?' in base_callback_url else '?'
    callback_url = f"{base_callback_url}{delimiter}token={security_token}"

    client = MpesaClient()

    stk_res = client.stk_push(
        phone_number=formatted_phone,
        amount=net_cash,
        callback_url=callback_url,
        account_reference=f"BATCH-{canonical_batch_id[:8]}",
        desc=f"Unlock {actual_target} Contacts"
    )

    res_code = stk_res.get('ResponseCode')
    if res_code == '0':
        merchant_req_id = stk_res.get('MerchantRequestID', '')
        checkout_req_id = stk_res.get('CheckoutRequestID', '')

        tx = MpesaTransaction.objects.create(
            user=user,
            merchant_request_id=merchant_req_id,
            checkout_request_id=checkout_req_id,
            amount=net_cash,
            phone_number=formatted_phone,
            tokens_used=tokens_used,
            target_batch_id=canonical_batch_id,
            status='PENDING'
        )

        return {
            "success": True,
            "is_free_or_token_covered": False,
            "checkout_request_id": checkout_req_id,
            "transaction_id": tx.id,
            "breakdown": breakdown,
            "is_mock": stk_res.get('is_mock', False),
            "message": stk_res.get('CustomerMessage', 'STK Push initiated. Please enter your M-Pesa PIN on your phone.')
        }
    else:
        error_msg = stk_res.get('errorMessage') or stk_res.get('ResponseDescription') or "Failed to initiate M-Pesa payment."
        return {
            "success": False,
            "message": error_msg
        }


@transaction.atomic
def process_mpesa_callback(callback_data, token=None):
    stk_callback = callback_data.get('Body', {}).get('stkCallback', {})
    if not stk_callback:
        return {"status": "error", "message": "Invalid payload format"}

    checkout_request_id = stk_callback.get('CheckoutRequestID')
    result_code = stk_callback.get('ResultCode')
    raw_desc = stk_callback.get('ResultDesc', 'Transaction failed.')

    mpesa_tx = MpesaTransaction.objects.select_for_update().filter(
        checkout_request_id=checkout_request_id
    ).first()

    if not mpesa_tx:
        return {"status": "ignored", "message": "Transaction record not found"}

    # Validate HMAC signature token
    expected_token = generate_callback_token(mpesa_tx.user_id, mpesa_tx.target_batch_id)
    if not token or not hmac.compare_digest(str(token), str(expected_token)):
        logger.warning("Rejected M-Pesa callback for transaction_id=%s: invalid token", mpesa_tx.pk)
        return {"status": "error", "message": "Invalid or missing security callback token"}

    if mpesa_tx.status in ['COMPLETED', 'FAILED', 'CANCELLED']:
        return {"status": "ignored", "message": "Transaction already processed"}

    friendly_desc = SAFARICOM_RESULT_MESSAGES.get(result_code, raw_desc)

    mpesa_tx.result_code = result_code
    mpesa_tx.result_desc = friendly_desc
    mpesa_tx.raw_callback_payload = callback_data

    if result_code == 0:
        meta_items = stk_callback.get('CallbackMetadata', {}).get('Item', [])
        meta_dict = {item.get('Name'): item.get('Value') for item in meta_items if 'Name' in item}

        paid_amount = Decimal(str(meta_dict.get('Amount', 0)))
        if paid_amount < mpesa_tx.amount:
            mpesa_tx.status = 'FAILED'
            mpesa_tx.result_desc = f"Payment mismatch. Expected {mpesa_tx.amount}, received {paid_amount}."
            
            save_fields = ['status', 'result_code', 'result_desc', 'raw_callback_payload']
            if hasattr(mpesa_tx, 'updated_at'):
                save_fields.append('updated_at')
            mpesa_tx.save(update_fields=save_fields)
            logger.warning(
                "Rejected underpaid M-Pesa callback for transaction_id=%s",
                mpesa_tx.pk,
            )
            
            return {"status": "failed", "message": "Amount mismatch"}

        mpesa_receipt = meta_dict.get('MpesaReceiptNumber', f"MOCK_REC_{checkout_request_id[-8:]}")
        mpesa_tx.mpesa_receipt_number = mpesa_receipt
        mpesa_tx.status = 'COMPLETED'
        
        save_fields = ['status', 'result_code', 'result_desc', 'raw_callback_payload']
        if hasattr(mpesa_tx, 'mpesa_receipt_number'):
            save_fields.append('mpesa_receipt_number')
        if hasattr(mpesa_tx, 'updated_at'):
            save_fields.append('updated_at')
            
        mpesa_tx.save(update_fields=save_fields)

        MpesaTransaction.objects.filter(
            user_id=mpesa_tx.user_id,
            target_batch_id=mpesa_tx.target_batch_id,
            status='PENDING'
        ).exclude(id=mpesa_tx.id).update(
            status='CANCELLED',
            result_desc='Cancelled - Batch unlocked via another transaction'
        )

        user = User.objects.select_for_update().get(pk=mpesa_tx.user_id)
        batch = MatchBatch.objects.filter(batch_id=mpesa_tx.target_batch_id).first()
        if not batch and str(mpesa_tx.target_batch_id).isdigit():
            batch = MatchBatch.objects.filter(pk=int(mpesa_tx.target_batch_id)).first()

        queue_req = None
        if not batch:
            queue_req = QueueRequest.objects.filter(user=user, pk=mpesa_tx.target_batch_id).first()
            if queue_req:
                batch = queue_req.batch
        else:
            queue_req = QueueRequest.objects.filter(batch=batch, user=user).first()

        target_size = (queue_req.target_size - 1) if (queue_req and queue_req.target_size) else 20
        pool_type = queue_req.type if queue_req else 'normal'
        phase = get_queue_request_pricing_phase(queue_req)

        breakdown = DownloadCheckoutEngine.calculate_checkout_breakdown(
            user=user,
            current_phase=phase,
            target_size=target_size,
            pool_type=pool_type
        )
        
        breakdown['tokens_used'] = mpesa_tx.tokens_used 

        DownloadCheckoutEngine.finalize_vcf_unlock(
            user=user, 
            checkout_breakdown=breakdown, 
            payment_reference=f"MPESA_{mpesa_receipt}"
        )

        if queue_req and queue_req.status != 'completed':
            queue_req.status = 'completed'
            queue_req.save(update_fields=['status'])

        if batch:
            matched_peers = QueueRequest.objects.filter(batch=batch).exclude(user=user)
            matched_users = [peer.user for peer in matched_peers if peer.user.is_active]
            
            injected_users = list(User.objects.filter(
                is_always_injected=True,
                is_active=True,
                is_temporarily_disabled=False
            ).exclude(id=user.id))
            
            all_users = list({u.id: u for u in matched_users + injected_users}.values())

            already_unlocked_ids = set(
                UnlockedContact.objects.filter(user=user).values_list('contact_id', flat=True)
            )
            new_contacts = [u for u in all_users if u.id not in already_unlocked_ids]
            if new_contacts:
                new_unlocks = [UnlockedContact(user=user, contact=u) for u in new_contacts]
                UnlockedContact.objects.bulk_create(new_unlocks, ignore_conflicts=True)

        logger.info(
            "M-Pesa payment completed for transaction_id=%s user_id=%s",
            mpesa_tx.pk,
            mpesa_tx.user_id,
        )
        return {"status": "success", "message": "Payment confirmed and batch unlocked"}
    else:
        mpesa_tx.status = 'CANCELLED' if result_code == 1032 else 'FAILED'
        
        save_fields = ['status', 'result_code', 'result_desc', 'raw_callback_payload']
        if hasattr(mpesa_tx, 'updated_at'):
            save_fields.append('updated_at')

        mpesa_tx.save(update_fields=save_fields)
        logger.info(
            "M-Pesa payment failed for transaction_id=%s result_code=%s",
            mpesa_tx.pk,
            result_code,
        )
        return {"status": "failed", "message": friendly_desc}