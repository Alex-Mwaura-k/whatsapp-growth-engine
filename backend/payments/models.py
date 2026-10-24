from decimal import Decimal
from django.db import models
from django.conf import settings


class MpesaTransaction(models.Model):
    STATUS_CHOICES = (
        ('PENDING', 'Pending'),
        ('COMPLETED', 'Completed'),
        ('FAILED', 'Failed'),
        ('CANCELLED', 'Cancelled'),
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='mpesa_transactions'
    )
    merchant_request_id = models.CharField(max_length=100, db_index=True)
    checkout_request_id = models.CharField(max_length=100, unique=True, db_index=True)
    amount = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        help_text="Net cash amount paid via M-Pesa"
    )
    phone_number = models.CharField(max_length=17)
    mpesa_receipt_number = models.CharField(max_length=50, blank=True, null=True, db_index=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING', db_index=True)
    result_code = models.IntegerField(null=True, blank=True)
    result_desc = models.TextField(blank=True, null=True)
    
    tokens_used = models.IntegerField(
        default=0, 
        help_text="Referral tokens applied as discount on this checkout"
    )
    
    target_batch_id = models.CharField(
        max_length=100, 
        null=True, 
        blank=True, 
        db_index=True, 
        help_text="UUID/ID string of the VCF Batch unlocked upon payment confirmation."
    )
    raw_callback_payload = models.JSONField(
        null=True, 
        blank=True, 
        help_text="Stores raw JSON webhook response from Safaricom Daraja for auditing."
    )

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['mpesa_receipt_number']),
            models.Index(fields=['target_batch_id']),
        ]

    def __str__(self):
        whatsapp_name = getattr(self.user, 'whatsapp_name', None) or getattr(self.user, 'phone_number', 'User')
        target_info = f" | Batch {self.target_batch_id}" if self.target_batch_id else ""
        return f"{whatsapp_name} - KES {self.amount} ({self.status}){target_info}"