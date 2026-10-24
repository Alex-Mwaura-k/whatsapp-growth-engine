from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

# Import from accounts app (Auth, Users, Categories)
from accounts.views import (
    RegisterView, 
    CategoryListView, 
    UserProfileView, 
    ChangePasswordView,
    DisableAccountView,  
    DeleteAccountView,    
    SessionLoginView,    
    SessionLogoutView,
    RequestPasswordResetView,
    VerifyPasswordResetTokenView, # <-- Added
    ResetPasswordConfirmView
)

# Import from matchmaker app (Core Engine)
from matchmaker.views import (
    JoinPoolView,        
    CurrentMatchView,
    UserBatchesView,
    DownloadVCFView,
    PoolStatusView
)

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # 1. AUTH & ACCOUNT MANAGEMENT
    path('api/users/register/', RegisterView.as_view(), name='register'),
    path('api/users/request-password-reset/', RequestPasswordResetView.as_view(), name='request_password_reset'),
    
    # Verify Token Endpoint
    path('api/users/reset-password-verify/', VerifyPasswordResetTokenView.as_view(), name='reset_password_verify'), # <-- Added
    
    path('api/users/reset-password-confirm/', ResetPasswordConfirmView.as_view(), name='reset_password_confirm'),
    
    # Secure Session Cookies
    path('api/login/', SessionLoginView.as_view(), name='api-login'),
    path('api/logout/', SessionLogoutView.as_view(), name='api-logout'),

    path('api/change-password/', ChangePasswordView.as_view(), name='change_password'),
    
    # Disable and Delete Account paths
    path('api/account/disable/', DisableAccountView.as_view(), name='disable_account'), 
    path('api/account/delete/', DeleteAccountView.as_view(), name='delete_account'),   
    
    # 2. IDENTITY & PROFILE
    path('api/users/me/', UserProfileView.as_view(), name='user_me'),
    path('api/profile/', UserProfileView.as_view(), name='user_profile'),
    
    # 3. CORE MATCHMAKING ENGINE
    path('api/categories/', CategoryListView.as_view(), name='category_list'),
    path('api/pools/status/', PoolStatusView.as_view(), name='pool_status'),
    path('api/pools/join/', JoinPoolView.as_view(), name='join_pool'),
    path('api/queue/my-match/', CurrentMatchView.as_view(), name='my_match'),
    path('api/queue/my-match/download/', DownloadVCFView.as_view(), name='download_vcf'),
    path('api/pools/my-batches/', UserBatchesView.as_view(), name='my_batches'),
    path('api/pools/download/', DownloadVCFView.as_view(), name='pools_download_vcf'),

    # 4. PAYMENTS (M-Pesa Integration)
    path('api/payments/', include('payments.urls')),
]

# ==========================================
# MEDIA FILES (Local Development)
# ==========================================
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)