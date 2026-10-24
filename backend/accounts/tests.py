from decimal import Decimal
from unittest.mock import patch

from django.conf import settings
from django.core.cache import cache
from django.core import mail
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from accounts.models import TokenTransaction, User
from accounts.serializers import UserSerializer
from rest_framework import serializers
from django.core.files.uploadedfile import SimpleUploadedFile


class ReferralRewardTests(TestCase):
    def test_registration_rejects_passwords_that_fail_configured_validators(self):
        response = APIClient().post(
            '/api/users/register/',
            {
                'phone_number': '+254733333330',
                'whatsapp_name': 'New Member',
                'password': '12345678',
                'terms_accepted': True,
            },
            format='json',
        )
        self.assertEqual(response.status_code, 400)
        self.assertFalse(User.objects.filter(phone_number='+254733333330').exists())

    def test_registration_rejects_password_similar_to_user_attributes(self):
        response = APIClient().post(
            '/api/users/register/',
            {
                'phone_number': '+254733333331',
                'whatsapp_name': 'NewMember2026',
                'password': 'NewMember2026',
                'terms_accepted': True,
            },
            format='json',
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn('password', response.data)
        self.assertFalse(User.objects.filter(phone_number='+254733333331').exists())

    def test_global_api_permission_default_is_authenticated(self):
        self.assertEqual(
            settings.REST_FRAMEWORK['DEFAULT_PERMISSION_CLASSES'],
            ['rest_framework.permissions.IsAuthenticated'],
        )

    @override_settings(PASSWORD_HASHERS=['django.contrib.auth.hashers.MD5PasswordHasher'])
    def test_login_rate_limit_is_enforced(self):
        user = User.objects.create_user(
            phone_number='+254733333336',
            whatsapp_name='Rate Limit User',
            password='test-password-123',
        )
        cache.clear()
        client = APIClient()
        payload = {'phone_number': user.phone_number, 'password': 'wrong-password'}
        responses = [
            client.post('/api/login/', payload, format='json')
            for _ in range(6)
        ]
        self.assertEqual([response.status_code for response in responses[:5]], [401] * 5)
        self.assertEqual(responses[5].status_code, 429)
        cache.clear()

    def test_profile_image_size_is_limited(self):
        uploaded_image = SimpleUploadedFile(
            'profile.png',
            b'x' * (5 * 1024 * 1024 + 1),
            content_type='image/png',
        )
        with self.assertRaises(serializers.ValidationError):
            UserSerializer().validate_profile_pic(uploaded_image)

    def test_users_cannot_change_temporary_disabled_flag_from_profile(self):
        user = User.objects.create_user(
            phone_number='+254733333337',
            whatsapp_name='Profile User',
            password='test-password-123',
        )
        serializer = UserSerializer(
            user,
            data={'is_temporarily_disabled': True},
            partial=True,
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        serializer.save()
        user.refresh_from_db()
        self.assertFalse(user.is_temporarily_disabled)

    def test_login_requires_csrf_and_allows_valid_csrf_token(self):
        user = User.objects.create_user(
            phone_number='+254733333335',
            whatsapp_name='Login User',
            password='test-password-123',
        )
        client = APIClient(enforce_csrf_checks=True)

        csrf_response = client.get('/api/login/')
        self.assertEqual(csrf_response.status_code, 204)
        csrf_token = csrf_response.cookies['csrftoken'].value

        payload = {
            'phone_number': user.phone_number,
            'password': 'test-password-123',
        }
        rejected_response = client.post('/api/login/', payload, format='json')
        self.assertEqual(rejected_response.status_code, 403)

        accepted_response = client.post(
            '/api/login/',
            payload,
            format='json',
            HTTP_X_CSRFTOKEN=csrf_token,
        )
        self.assertEqual(accepted_response.status_code, 200)

    def test_registration_requires_and_records_terms_acceptance(self):
        client = APIClient()
        payload = {
            'phone_number': '+254733333334',
            'whatsapp_name': 'New Member',
            'password': 'test-password-123',
        }

        rejected_response = client.post(
            '/api/users/register/',
            {**payload, 'terms_accepted': False},
            format='json',
        )
        self.assertEqual(rejected_response.status_code, 400)
        self.assertFalse(User.objects.filter(phone_number='+254733333334').exists())

        missing_acceptance_response = client.post(
            '/api/users/register/',
            payload,
            format='json',
        )
        self.assertEqual(missing_acceptance_response.status_code, 400)
        self.assertFalse(User.objects.filter(phone_number='+254733333334').exists())

        accepted_response = client.post(
            '/api/users/register/',
            {**payload, 'terms_accepted': True},
            format='json',
        )
        self.assertEqual(accepted_response.status_code, 201)
        user = User.objects.get(phone_number='+254733333334')
        self.assertIsNotNone(user.terms_accepted_at)
        self.assertEqual(user.terms_version, '2026-10-23')
        self.assertEqual(user.privacy_version, '2026-10-23')

    def test_profile_recompletion_does_not_repeat_referral_reward(self):
        referrer = User.objects.create_user(
            phone_number='+254711111111',
            whatsapp_name='Referrer',
            password='test-password-123',
        )
        referred_user = User.objects.create_user(
            phone_number='+254722222222',
            whatsapp_name='Referred',
            password='test-password-123',
            referred_by=referrer,
        )
        client = APIClient()
        client.force_authenticate(user=referred_user)

        complete_profile = {
            'gender': 'M',
            'age_range': '25-29',
            'location_country': 'Kenya',
            'location_state_county': 'Nairobi',
            'bio': 'Business profile',
        }

        with patch('accounts.views.get_current_referral_reward', return_value=Decimal('10.00')):
            response = client.patch('/api/users/me/', complete_profile, format='json')
            self.assertEqual(response.status_code, 200)

            response = client.patch(
                '/api/users/me/',
                {'bio': ''},
                format='json',
            )
            self.assertEqual(response.status_code, 200)

            response = client.patch(
                '/api/users/me/',
                {'bio': 'Business profile restored'},
                format='json',
            )
            self.assertEqual(response.status_code, 200)

        referrer.refresh_from_db()
        referred_user.refresh_from_db()
        self.assertEqual(referrer.wallet_balance, Decimal('10.00'))
        self.assertTrue(referred_user.has_rewarded_referrer)
        self.assertEqual(
            TokenTransaction.objects.filter(
                user=referrer,
                transaction_type='REFERRAL_REWARD',
            ).count(),
            1,
        )

    @override_settings(
        EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend',
        FRONTEND_URL='https://growth.example.test',
    )
    def test_password_reset_email_uses_configured_frontend_url(self):
        user = User.objects.create_user(
            phone_number='+254733333333',
            whatsapp_name='Reset User',
            email='reset@example.test',
            password='test-password-123',
        )
        response = APIClient().post(
            '/api/users/request-password-reset/',
            {'email': user.email},
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn(
            'https://growth.example.test/reset-password/',
            mail.outbox[0].body,
        )

        nonexistent_response = APIClient().post(
            '/api/users/request-password-reset/',
            {'email': 'missing@example.test'},
            format='json',
        )
        self.assertEqual(nonexistent_response.status_code, response.status_code)
        self.assertEqual(nonexistent_response.data, response.data)
