from django.contrib import admin
from .models import MpesaTransaction


@admin.register(MpesaTransaction)
class MpesaTransactionAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'user',
        'amount',
        'tokens_used',
        'phone_number',
        'status',
        'mpesa_receipt_number',
        'target_batch_id',
        'created_at',
    )
    list_filter = ('status', 'created_at')
    search_fields = (
        'merchant_request_id',
        'checkout_request_id',
        'mpesa_receipt_number',
        'phone_number',
        'target_batch_id',
        'user__phone_number',
        'user__whatsapp_name',
    )
    readonly_fields = (
        'merchant_request_id',
        'checkout_request_id',
        'raw_callback_payload',
        'created_at',
        'updated_at',
    )
    ordering = ('-created_at',)