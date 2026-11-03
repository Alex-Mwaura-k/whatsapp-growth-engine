from unittest.mock import patch

from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from accounts.models import User
from matchmaker.models import PushSubscription, QueueRequest
from matchmaker.push import _send_batch_ready, is_allowed_push_endpoint

FCM_ENDPOINT = 'https://fcm.googleapis.com/fcm/send/abc123'
VALID_BODY = {'endpoint': FCM_ENDPOINT, 'keys': {'p256dh': 'p-key', 'auth': 'a-key'}}


class PushEndpointAllowListTests(TestCase):
    def test_accepts_known_push_services(self):
        for url in (
            FCM_ENDPOINT,
            'https://updates.push.services.mozilla.com/wpush/v2/xyz',
            'https://web.push.apple.com/abc',
            'https://wns2-par02p.notify.windows.com/w/?token=abc',
        ):
            self.assertTrue(is_allowed_push_endpoint(url), url)

    def test_rejects_other_hosts_and_schemes(self):
        for url in (
            'http://fcm.googleapis.com/fcm/send/abc',
            'https://127.0.0.1/internal',
            'https://evil.example.com/fcm.googleapis.com',
            'https://fcm.googleapis.com.evil.com/x',
            'https://user:pw@fcm.googleapis.com/x',
            'not a url',
        ):
            self.assertFalse(is_allowed_push_endpoint(url), url)


class PushSubscriptionApiTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            phone_number='+254711111111', whatsapp_name='Pusher', password='test-password-123'
        )
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def test_requires_authentication(self):
        response = APIClient().post('/api/push/subscribe/', VALID_BODY, format='json')
        self.assertIn(response.status_code, (401, 403))

    def test_subscribe_creates_and_reassigns_device(self):
        self.assertEqual(self.client.post('/api/push/subscribe/', VALID_BODY, format='json').status_code, 200)
        self.assertEqual(PushSubscription.objects.get(endpoint=FCM_ENDPOINT).user, self.user)

        other = User.objects.create_user(
            phone_number='+254722222222', whatsapp_name='Other', password='test-password-123'
        )
        other_client = APIClient()
        other_client.force_authenticate(other)
        other_client.post('/api/push/subscribe/', VALID_BODY, format='json')
        self.assertEqual(PushSubscription.objects.count(), 1)
        self.assertEqual(PushSubscription.objects.get().user, other)

    def test_rejects_invalid_and_disallowed_subscriptions(self):
        bad_bodies = [
            {},
            {'endpoint': FCM_ENDPOINT},
            {'endpoint': FCM_ENDPOINT, 'keys': 'nope'},
            {'endpoint': 'https://127.0.0.1/x', 'keys': {'p256dh': 'p', 'auth': 'a'}},
        ]
        for body in bad_bodies:
            response = self.client.post('/api/push/subscribe/', body, format='json')
            self.assertEqual(response.status_code, 400, body)
        self.assertEqual(PushSubscription.objects.count(), 0)

    def test_unsubscribe_only_removes_own_device(self):
        self.client.post('/api/push/subscribe/', VALID_BODY, format='json')
        other = User.objects.create_user(
            phone_number='+254733333333', whatsapp_name='Other', password='test-password-123'
        )
        other_client = APIClient()
        other_client.force_authenticate(other)
        other_client.post('/api/push/unsubscribe/', {'endpoint': FCM_ENDPOINT}, format='json')
        self.assertEqual(PushSubscription.objects.count(), 1)

        self.client.post('/api/push/unsubscribe/', {'endpoint': FCM_ENDPOINT}, format='json')
        self.assertEqual(PushSubscription.objects.count(), 0)

    @override_settings(VAPID_PUBLIC_KEY='', VAPID_PRIVATE_KEY='')
    def test_public_key_reports_disabled_without_keys(self):
        response = self.client.get('/api/push/public-key/')
        self.assertEqual(response.json(), {'enabled': False})

    @override_settings(VAPID_PUBLIC_KEY='pub', VAPID_PRIVATE_KEY='priv')
    def test_public_key_never_exposes_private_key(self):
        data = self.client.get('/api/push/public-key/').json()
        self.assertEqual(data, {'enabled': True, 'public_key': 'pub'})


@override_settings(VAPID_PUBLIC_KEY='pub', VAPID_PRIVATE_KEY='priv')
class PushDeliveryTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            phone_number='+254744444000', whatsapp_name='Receiver', password='test-password-123'
        )
        PushSubscription.objects.create(
            user=self.user, endpoint=FCM_ENDPOINT, p256dh='p-key', auth='a-key'
        )
        QueueRequest.objects.create(user=self.user, status='matched')

    @patch('django.db.connections.close_all')
    @patch('pywebpush.webpush')
    def test_sends_notification_without_contact_data(self, mock_webpush, _close):
        _send_batch_ready([self.user.id])
        self.assertEqual(mock_webpush.call_count, 1)
        kwargs = mock_webpush.call_args.kwargs
        self.assertEqual(kwargs['subscription_info']['endpoint'], FCM_ENDPOINT)
        self.assertNotIn('+254', kwargs['data'])
        self.assertIn('"count": 1', kwargs['data'])

    @patch('django.db.connections.close_all')
    @patch('pywebpush.webpush')
    def test_expired_subscription_is_removed(self, mock_webpush, _close):
        from pywebpush import WebPushException

        class Gone:
            status_code = 410

        mock_webpush.side_effect = WebPushException('gone', response=Gone())
        _send_batch_ready([self.user.id])
        self.assertEqual(PushSubscription.objects.count(), 0)

    @patch('django.db.connections.close_all')
    @patch('pywebpush.webpush')
    def test_disabled_users_are_not_notified(self, mock_webpush, _close):
        self.user.is_temporarily_disabled = True
        self.user.save()
        _send_batch_ready([self.user.id])
        mock_webpush.assert_not_called()
