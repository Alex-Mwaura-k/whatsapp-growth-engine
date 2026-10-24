from decimal import Decimal
from unittest.mock import patch

from django.test import TestCase, override_settings

from accounts.models import User
from matchmaker.models import MatchBatch, QueueRequest
from matchmaker.services import DownloadCheckoutEngine
from payments.models import MpesaTransaction
from payments.services import (
    generate_callback_token,
    initiate_batch_stk_push,
    process_mpesa_callback,
)


class CheckoutReservationTests(TestCase):
    def test_checkout_uses_latest_account_balance_not_stale_user_instance(self):
        user = User.objects.create_user(
            phone_number='+254766666665',
            whatsapp_name='Updated Balance User',
            password='test-password-123',
            wallet_balance=Decimal('10.00'),
        )
        stale_user = User.objects.get(pk=user.pk)
        User.objects.filter(pk=user.pk).update(wallet_balance=Decimal('18.00'))

        breakdown = DownloadCheckoutEngine.calculate_checkout_breakdown(
            user=stale_user,
            current_phase='PHASE_2_VIRAL_LOOP',
            target_size=20,
        )

        self.assertEqual(breakdown['account_token_balance'], 18)
        self.assertEqual(breakdown['reserved_tokens'], 0)
        self.assertEqual(breakdown['available_tokens'], 18)
        self.assertEqual(breakdown['tokens_used'], 18)
        self.assertEqual(breakdown['net_cash_required'], 2.0)

    def test_pending_payment_tokens_are_reserved_from_other_checkouts(self):
        user = User.objects.create_user(
            phone_number='+254766666666',
            whatsapp_name='Checkout User',
            password='test-password-123',
            wallet_balance=Decimal('20.00'),
        )
        MpesaTransaction.objects.create(
            user=user,
            merchant_request_id='merchant-reservation-test',
            checkout_request_id='checkout-reservation-test',
            amount=Decimal('22.50'),
            phone_number='254766666666',
            tokens_used=15,
            target_batch_id='batch-reservation-test',
            status='PENDING',
        )

        breakdown = DownloadCheckoutEngine.calculate_checkout_breakdown(
            user=user,
            current_phase='PHASE_3_SOFT_CASH',
            target_size=20,
        )

        self.assertEqual(breakdown['tokens_used'], 5)
        self.assertEqual(breakdown['net_cash_required'], 22.5)

    def test_failed_callback_releases_reserved_tokens_for_next_checkout(self):
        user = User.objects.create_user(
            phone_number='+254766666664',
            whatsapp_name='Failed Checkout User',
            password='test-password-123',
            wallet_balance=Decimal('18.00'),
        )
        batch = MatchBatch.objects.create()
        tx = MpesaTransaction.objects.create(
            user=user,
            merchant_request_id='merchant-failed-callback',
            checkout_request_id='checkout-failed-callback',
            amount=Decimal('2.00'),
            phone_number='254766666664',
            tokens_used=18,
            target_batch_id=str(batch.batch_id),
            status='PENDING',
        )
        callback = {
            'Body': {
                'stkCallback': {
                    'CheckoutRequestID': tx.checkout_request_id,
                    'ResultCode': 1032,
                    'ResultDesc': 'Request cancelled by user',
                },
            },
        }

        result = process_mpesa_callback(
            callback,
            token=generate_callback_token(user.id, str(batch.batch_id)),
        )

        self.assertEqual(result['status'], 'failed')
        tx.refresh_from_db()
        user.refresh_from_db()
        breakdown = DownloadCheckoutEngine.calculate_checkout_breakdown(
            user=user,
            current_phase='PHASE_2_VIRAL_LOOP',
            target_size=20,
        )
        self.assertEqual(tx.status, 'CANCELLED')
        self.assertEqual(user.wallet_balance, Decimal('18.00'))
        self.assertEqual(breakdown['reserved_tokens'], 0)
        self.assertEqual(breakdown['available_tokens'], 18)
        self.assertEqual(breakdown['tokens_used'], 18)
        self.assertEqual(breakdown['net_cash_required'], 2.0)

    @patch('matchmaker.services.get_platform_phase', return_value=('PHASE_4_SQUEEZED', 3000))
    @patch('payments.services.MpesaClient')
    def test_batch_ready_in_free_phase_remains_free_after_phase_change(self, mpesa_client, _phase):
        user = User.objects.create_user(
            phone_number='+254766666667',
            whatsapp_name='Free Batch User',
            password='test-password-123',
        )
        batch = MatchBatch.objects.create()
        queue_request = QueueRequest.objects.create(
            user=user,
            batch=batch,
            target_size=21,
            status='matched',
            ready_phase='PHASE_1_BOOTSTRAP',
        )

        result = initiate_batch_stk_push(
            user=user,
            phone_number='254766666667',
            batch_id=str(batch.batch_id),
            target_size=20,
        )

        self.assertTrue(result['success'])
        self.assertTrue(result['is_free_or_token_covered'])
        self.assertEqual(result['net_cash_required'], 0.0)
        queue_request.refresh_from_db()
        self.assertEqual(queue_request.status, 'completed')
        mpesa_client.assert_not_called()

    @patch('matchmaker.services.get_platform_phase', return_value=('PHASE_4_SQUEEZED', 3000))
    @patch('payments.services.MpesaClient')
    def test_legacy_ready_batch_without_phase_snapshot_is_grandfathered_free(
        self,
        mpesa_client,
        _phase,
    ):
        user = User.objects.create_user(
            phone_number='+254766666668',
            whatsapp_name='Legacy Batch User',
            password='test-password-123',
        )
        batch = MatchBatch.objects.create()
        QueueRequest.objects.create(
            user=user,
            batch=batch,
            target_size=21,
            status='matched',
        )

        result = initiate_batch_stk_push(
            user=user,
            phone_number='254766666668',
            batch_id=str(batch.batch_id),
            target_size=20,
        )

        self.assertTrue(result['success'])
        self.assertTrue(result['is_free_or_token_covered'])
        self.assertEqual(result['net_cash_required'], 0.0)
        mpesa_client.assert_not_called()

    @override_settings(MPESA_CALLBACK_URL='', MPESA_MOCK_MODE=False)
    @patch('matchmaker.services.get_platform_phase', return_value=('PHASE_3_SOFT_CASH', 1000))
    @patch('payments.services.MpesaClient')
    def test_real_payment_requires_public_callback_url(self, mpesa_client, _phase):
        user = User.objects.create_user(
            phone_number='+254777777777',
            whatsapp_name='Callback User',
            password='test-password-123',
        )
        batch = MatchBatch.objects.create()
        QueueRequest.objects.create(
            user=user,
            batch=batch,
            target_size=21,
            status='matched',
            ready_phase='PHASE_3_SOFT_CASH',
        )

        result = initiate_batch_stk_push(
            user=user,
            phone_number='254777777777',
            batch_id=str(batch.batch_id),
            target_size=20,
        )

        self.assertFalse(result['success'])
        self.assertIn('MPESA_CALLBACK_URL', result['message'])
        mpesa_client.assert_not_called()


class MpesaCallbackTests(TestCase):
    @patch('payments.services.MpesaClient')
    def test_successful_callback_completes_payment_without_query_veto(self, mpesa_client):
        user = User.objects.create_user(
            phone_number='+254766666669',
            whatsapp_name='Paid Batch User',
            password='test-password-123',
            wallet_balance=Decimal('18.00'),
        )
        batch = MatchBatch.objects.create()
        queue_request = QueueRequest.objects.create(
            user=user,
            batch=batch,
            target_size=21,
            status='matched',
            ready_phase='PHASE_3_SOFT_CASH',
        )
        tx = MpesaTransaction.objects.create(
            user=user,
            merchant_request_id='merchant-success-callback',
            checkout_request_id='checkout-success-callback',
            amount=Decimal('2.00'),
            phone_number='254766666669',
            tokens_used=18,
            target_batch_id=str(batch.batch_id),
            status='PENDING',
        )
        callback = {
            'Body': {
                'stkCallback': {
                    'CheckoutRequestID': tx.checkout_request_id,
                    'ResultCode': 0,
                    'ResultDesc': 'The service request is processed successfully.',
                    'CallbackMetadata': {
                        'Item': [
                            {'Name': 'Amount', 'Value': 2.00},
                            {'Name': 'MpesaReceiptNumber', 'Value': 'RECEIPT123'},
                            {'Name': 'PhoneNumber', 'Value': 254766666669},
                        ],
                    },
                },
            },
        }

        result = process_mpesa_callback(
            callback,
            token=generate_callback_token(user.id, str(batch.batch_id)),
        )

        self.assertEqual(result['status'], 'success')
        tx.refresh_from_db()
        queue_request.refresh_from_db()
        user.refresh_from_db()
        self.assertEqual(tx.status, 'COMPLETED')
        self.assertEqual(tx.mpesa_receipt_number, 'RECEIPT123')
        self.assertEqual(queue_request.status, 'completed')
        self.assertEqual(user.wallet_balance, Decimal('0.00'))
        mpesa_client.assert_not_called()

# Create your tests here.
