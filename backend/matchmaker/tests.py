from unittest.mock import patch

from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import User
from matchmaker.models import MatchBatch, QueueRequest
from matchmaker.services import (
    MatchingEngine,
    _matches_request_filters,
    check_and_form_batches,
    generate_vcf_from_users,
)


class MatchingFilterTests(TestCase):
    def setUp(self):
        self.member = User.objects.create_user(
            phone_number='+254744444444',
            whatsapp_name='Member',
            password='test-password-123',
        )
        self.member.gender = 'M'
        self.member.location_country = 'Kenya'
        self.member.location_state_county = 'Nairobi'
        self.member.age_range = '25-29'
        self.member.save()

    def test_filtered_requests_must_be_mutually_compatible(self):
        candidate = User.objects.create_user(
            phone_number='+254755555555',
            whatsapp_name='Candidate',
            password='test-password-123',
        )
        candidate.gender = 'F'
        candidate.location_country = 'kenya'
        candidate.location_state_county = 'Nairobi'
        candidate.age_range = '30-34'
        candidate.save()

        member_request = QueueRequest(
            user=self.member,
            target_gender='F',
            target_country='KENYA',
            target_state='Nairobi',
            target_age_range='',
        )
        candidate_request = QueueRequest(
            user=candidate,
            target_gender='M',
            target_country='Kenya',
            target_state='',
            target_age_range='25-29',
        )

        self.assertTrue(_matches_request_filters(member_request, candidate))
        self.assertTrue(_matches_request_filters(candidate_request, self.member))
        candidate_request.target_gender = 'O'
        self.assertFalse(_matches_request_filters(candidate_request, self.member))

    def test_invalid_target_does_not_create_queue_request(self):
        with self.assertRaisesRegex(ValueError, 'Target must be 20 or 100 contacts'):
            MatchingEngine.process_pool_entry(
                user=self.member,
                target_size=50,
            )

        self.assertFalse(QueueRequest.objects.filter(user=self.member).exists())

    def test_vcf_escapes_user_controlled_values_without_injecting_properties(self):
        self.member.whatsapp_name = 'Contact\r\nFN:Injected'
        self.member.first_name = 'First\r\nX-INJECTED: yes'
        self.member.last_name = 'Last,Name;Other'
        self.member.bio = 'Business\r\nX-NOTE-INJECTED: yes'
        self.member.location_country = 'Kenya\r\nX-ADR-INJECTED: yes'
        self.member.save()

        vcf = generate_vcf_from_users([self.member], pool_type='filtered')

        self.assertIn(r'FN:Contact\nFN:Injected', vcf)
        self.assertIn(r'N:Last\,Name\;Other;First\nX-INJECTED: yes;;;', vcf)
        self.assertIn(r'Business: Business\nX-NOTE-INJECTED: yes', vcf)
        self.assertIn(r'ADR;TYPE=WORK:;;;;;;Kenya\nX-ADR-INJECTED: yes', vcf)
        self.assertNotIn('\r\nX-INJECTED:', vcf)
        self.assertNotIn('\r\nX-NOTE-INJECTED:', vcf)
        self.assertNotIn('\r\nX-ADR-INJECTED:', vcf)


class BatchPricingSnapshotTests(TestCase):
    def test_matching_stores_the_phase_when_batch_becomes_ready(self):
        users = [
            User.objects.create_user(
                phone_number=f'+2547000000{index:02d}',
                whatsapp_name=f'Batch User {index}',
                password='test-password-123',
            )
            for index in range(21)
        ]
        requests = [
            QueueRequest.objects.create(
                user=user,
                target_size=21,
                status='pending',
            )
            for user in users
        ]

        with patch('matchmaker.services.get_platform_phase', return_value=('PHASE_1_BOOTSTRAP', 100)):
            check_and_form_batches()

        for queue_request in requests:
            queue_request.refresh_from_db()
            self.assertEqual(queue_request.status, 'matched')
            self.assertEqual(queue_request.ready_phase, 'PHASE_1_BOOTSTRAP')


class ActiveQueueRecoveryTests(TestCase):
    def test_current_match_prefers_pending_queue_over_newer_completed_batch(self):
        user = User.objects.create_user(
            phone_number='+254788888881',
            whatsapp_name='Queue User',
            password='test-password-123',
        )
        QueueRequest.objects.create(
            user=user,
            target_size=21,
            status='pending',
        )
        QueueRequest.objects.create(
            user=user,
            target_size=21,
            status='completed',
            batch=MatchBatch.objects.create(),
        )
        client = APIClient()
        client.force_authenticate(user=user)

        response = client.get('/api/queue/my-match/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['status'], 'pending')
        self.assertEqual(response.data['current'], 1)

    def test_join_is_rejected_when_user_already_has_pending_request(self):
        user = User.objects.create_user(
            phone_number='+254788888882',
            whatsapp_name='Already Queued User',
            password='test-password-123',
        )
        QueueRequest.objects.create(
            user=user,
            target_size=21,
            status='pending',
        )

        with self.assertRaisesRegex(ValueError, 'already in the queue'):
            MatchingEngine.process_pool_entry(user=user, target_size=20)

# Create your tests here.
