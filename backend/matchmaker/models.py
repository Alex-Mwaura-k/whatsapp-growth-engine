import uuid
from django.db import models
from django.conf import settings


class MatchBatch(models.Model):
    batch_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)  # Indexed for traffic monitoring
    is_ready = models.BooleanField(default=False, db_index=True)
    file_content = models.FileField(upload_to='vcf_batches/', null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Batch {self.batch_id} ({'Ready' if self.is_ready else 'Processing'})"


class QueueRequest(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Waiting for Matches'),
        ('matched', 'Batch Ready - Awaiting Action'),
        ('completed', 'Downloaded'),
        ('expired', 'Request Timed Out'),
        ('cancelled', 'Cancelled')
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='queue_requests'
    )
    requested_category = models.ForeignKey(
        'accounts.Category', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='queue_requests'
    )
    
    # Pool Engine Parameters
    type = models.CharField(max_length=20, default='normal', db_index=True)  # 'normal' or 'filtered'
    target_size = models.IntegerField(default=21, db_index=True)  # 21 for 20-contact pools; 101 for 100-contact pools
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending', db_index=True)
    ready_phase = models.CharField(max_length=32, null=True, blank=True)
    batch = models.ForeignKey(
        MatchBatch, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='queue_requests'
    )

    # Explicit Target Filters (Null / Blank = Any / Unfiltered)
    target_gender = models.CharField(max_length=10, null=True, blank=True)
    target_country = models.CharField(max_length=100, null=True, blank=True)
    target_state = models.CharField(max_length=100, null=True, blank=True)
    target_age_range = models.CharField(max_length=20, null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)  # Indexed for fast traffic calculations

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'type', 'created_at']),
            models.Index(fields=['user', 'status']),
        ]

    def __str__(self):
        return f"{self.user.whatsapp_name} - {self.type.upper()} - {self.status} (Target: {self.target_size})"


class HistoryLedger(models.Model):
    user_a = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='matches_sent')
    user_b = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='matches_received')
    matched_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['user_a', 'user_b'], name='unique_match_pair')
        ]

    def __str__(self):
        return f"Match: {self.user_a} <-> {self.user_b}"


class UnlockedContact(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='unlocked_contacts'
    )
    contact = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='unlocked_by'
    )
    unlocked_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['user', 'contact'], name='unique_user_contact_unlock')
        ]

    def __str__(self):
        return f"{self.user.whatsapp_name} unlocked {self.contact.whatsapp_name}"