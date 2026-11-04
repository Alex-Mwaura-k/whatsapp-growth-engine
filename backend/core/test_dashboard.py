from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse

User = get_user_model()


class StatsDashboardTests(TestCase):
    def setUp(self):
        self.url = reverse('admin_stats')
        self.staff = User.objects.create_user(
            phone_number='+254700000001', password='pass12345!', whatsapp_name='Staff', is_staff=True
        )
        self.admin = User.objects.create_superuser(
            phone_number='+254700000002', password='pass12345!', whatsapp_name='Boss'
        )

    def test_anonymous_redirected_to_login(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 302)
        self.assertIn('/admin/login/', response['Location'])

    def test_staff_non_superuser_denied(self):
        self.client.force_login(self.staff)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 302)
        self.assertIn('/admin/login/', response['Location'])

    def test_superuser_sees_stats_without_phone_numbers(self):
        self.client.force_login(self.admin)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Total revenue')
        self.assertNotContains(response, '+254700000001')
        self.assertEqual(response.context['stats']['users']['total'], 1)
