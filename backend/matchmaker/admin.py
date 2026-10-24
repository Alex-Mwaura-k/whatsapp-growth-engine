from django.contrib import admin
from .models import MatchBatch, QueueRequest, HistoryLedger, UnlockedContact

@admin.register(MatchBatch)
class MatchBatchAdmin(admin.ModelAdmin):
    # Removed 'target_size' here
    list_display = ('batch_id', 'is_ready', 'created_at')
    list_filter = ('is_ready', 'created_at')
    search_fields = ('batch_id',)

@admin.register(QueueRequest)
class QueueRequestAdmin(admin.ModelAdmin):
    list_display = ('user', 'requested_category', 'status', 'batch', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('user__phone_number', 'user__whatsapp_name')

@admin.register(HistoryLedger)
class HistoryLedgerAdmin(admin.ModelAdmin):
    list_display = ('user_a', 'user_b', 'matched_at')
    search_fields = ('user_a__phone_number', 'user_b__phone_number')

@admin.register(UnlockedContact)
class UnlockedContactAdmin(admin.ModelAdmin):
    list_display = ('user', 'contact', 'unlocked_at')
    search_fields = ('user__phone_number', 'contact__phone_number')