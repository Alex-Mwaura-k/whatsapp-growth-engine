from django.urls import path
from .views import (
    InitiateStkPushView,
    MockSimulateCallbackView,
    MpesaCallbackView,
    PaymentStatusView,
    PaymentHistoryView
)

urlpatterns = [
    path('stk-push/', InitiateStkPushView.as_view(), name='stk_push_initiate'),
    path('mock-callback/', MockSimulateCallbackView.as_view(), name='mock_callback_simulate'),
    path('mpesa/callback/', MpesaCallbackView.as_view(), name='mpesa_callback'),
    path('status/<str:checkout_request_id>/', PaymentStatusView.as_view(), name='payment_status'),
    path('history/', PaymentHistoryView.as_view(), name='payment_history'),
]