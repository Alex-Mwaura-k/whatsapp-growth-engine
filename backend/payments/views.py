import re
from decimal import Decimal
from django.conf import settings
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny

from accounts.models import TokenTransaction
from payments.models import MpesaTransaction
from payments.services import (
    initiate_batch_stk_push,
    process_mpesa_callback,
    generate_callback_token
)


def sanitize_phone_number(phone):
    if not phone:
        return None
    
    cleaned = re.sub(r'[\s\-\+]', '', str(phone))
    
    if cleaned.startswith('0'):
        cleaned = f"254{cleaned[1:]}"
    elif cleaned.startswith('7') or cleaned.startswith('1'):
        cleaned = f"254{cleaned}"
    
    if re.match(r'^254[71]\d{8}$', cleaned):
        return cleaned
    
    return None


class InitiateStkPushView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_scope = 'payment_initiation'

    def post(self, request):
        user = request.user
        batch_id = request.data.get('batch_id')
        raw_phone = request.data.get('phone_number') or getattr(user, 'phone_number', '')
        raw_target = request.data.get('target', 20)

        if not batch_id:
            return Response({"error": "batch_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        phone_number = sanitize_phone_number(raw_phone)
        if not phone_number:
            return Response(
                {"error": "Please enter a valid Safaricom phone number (e.g., 0712345678 or 0112345678)."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            target_size = int(raw_target)
        except (ValueError, TypeError):
            target_size = 20

        result = initiate_batch_stk_push(
            user=user,
            phone_number=phone_number,
            batch_id=batch_id,
            target_size=target_size
        )

        if result.get("success"):
            return Response(result, status=status.HTTP_200_OK)
        return Response(result, status=status.HTTP_400_BAD_REQUEST)


class MockSimulateCallbackView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not getattr(settings, 'DEBUG', False):
            return Response(
                {"error": "Mock simulations are strictly disabled in production."}, 
                status=status.HTTP_403_FORBIDDEN
            )

        checkout_request_id = request.data.get('checkout_request_id')
        
        tx = MpesaTransaction.objects.filter(
            checkout_request_id=checkout_request_id, 
            user=request.user
        ).first()

        if not tx:
            return Response({"error": "Transaction not found."}, status=status.HTTP_404_NOT_FOUND)

        mock_payload = {
            "Body": {
                "stkCallback": {
                    "MerchantRequestID": tx.merchant_request_id,
                    "CheckoutRequestID": tx.checkout_request_id,
                    "ResultCode": 0,
                    "ResultDesc": "The service request is processed successfully.",
                    "CallbackMetadata": {
                        "Item": [
                            {"Name": "Amount", "Value": float(tx.amount)},
                            {"Name": "MpesaReceiptNumber", "Value": f"MOCK_{tx.checkout_request_id[-8:]}"},
                            {"Name": "PhoneNumber", "Value": tx.phone_number}
                        ]
                    }
                }
            }
        }

        token = generate_callback_token(tx.user_id, tx.target_batch_id)
        result = process_mpesa_callback(mock_payload, token=token)
        return Response(result, status=status.HTTP_200_OK)


@method_decorator(csrf_exempt, name='dispatch')
class MpesaCallbackView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []  

    def post(self, request):
        callback_data = request.data
        token = request.GET.get('token') or request.query_params.get('token')
        result = process_mpesa_callback(callback_data, token=token)
        return Response({
            "ResultCode": 0,
            "ResultDesc": "Accepted",
            "internal_status": result.get("status")
        }, status=status.HTTP_200_OK)


class PaymentStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, checkout_request_id):
        tx = MpesaTransaction.objects.filter(
            checkout_request_id=checkout_request_id, 
            user=request.user
        ).first()

        if not tx:
            return Response({"error": "Transaction not found."}, status=status.HTTP_404_NOT_FOUND)

        token_field = 'wallet_balance' if hasattr(request.user, 'wallet_balance') else 'referral_tokens'
        current_tokens = float(getattr(request.user, token_field, 0) or 0)

        receipt = getattr(tx, 'mpesa_receipt_number', getattr(tx, 'mpesa_receipt', ''))

        return Response({
            "checkout_request_id": tx.checkout_request_id,
            "status": tx.status,
            "amount": float(tx.amount),
            "tokens_used": tx.tokens_used,
            "mpesa_receipt": receipt,
            "result_desc": tx.result_desc,
            "target_batch_id": tx.target_batch_id,
            "referral_tokens": current_tokens
        }, status=status.HTTP_200_OK)


class PaymentHistoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        mpesa_txs = MpesaTransaction.objects.filter(user=request.user)[:20]
        token_txs = TokenTransaction.objects.filter(user=request.user)[:20]

        mpesa_data = [
            {
                "id": tx.id,
                "checkout_request_id": tx.checkout_request_id,
                "amount": float(tx.amount),
                "tokens_used": tx.tokens_used,
                "receipt": getattr(tx, 'mpesa_receipt_number', getattr(tx, 'mpesa_receipt', '')),
                "target_batch_id": tx.target_batch_id,
                "status": tx.status,
                "created_at": tx.created_at.strftime("%Y-%m-%d %H:%M:%S")
            }
            for tx in mpesa_txs
        ]

        token_data = [
            {
                "id": tx.id,
                "amount": float(tx.amount),
                "type": tx.transaction_type,
                "description": tx.description,
                "created_at": tx.created_at.strftime("%Y-%m-%d %H:%M:%S")
            }
            for tx in token_txs
        ]

        token_field = 'wallet_balance' if hasattr(request.user, 'wallet_balance') else 'referral_tokens'
        current_tokens = float(getattr(request.user, token_field, 0) or 0)

        return Response({
            "referral_tokens": current_tokens,
            "mpesa_transactions": mpesa_data,
            "token_ledger": token_data
        }, status=status.HTTP_200_OK)