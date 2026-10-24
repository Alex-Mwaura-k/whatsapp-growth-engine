import re
import logging
from smtplib import SMTPException
from decimal import Decimal
from django.conf import settings
from django.db import transaction
from django.core.mail import send_mail
from django.contrib.auth import update_session_auth_hash, authenticate, login, logout
from django.contrib.auth.tokens import default_token_generator
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.contrib.sessions.models import Session
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str

from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from .models import User, Category, TokenTransaction
from .serializers import RegisterSerializer, CategorySerializer, UserSerializer
from .services import calculate_dynamic_referral_reward

logger = logging.getLogger('security.audit')


def normalize_phone_number(phone, default_country_code='254'):
    if not phone:
        return phone
    digits = re.sub(r'\D', '', str(phone))
    if digits.startswith('0'):
        digits = default_country_code + digits[1:]
    elif not digits.startswith(default_country_code) and len(digits) == 9:
        digits = default_country_code + digits
    return f"+{digits}"


def get_current_referral_reward():
    """
    Delegates tier calculation to accounts.services to ensure consistent logic
    based on User.objects.filter(is_active=True, is_profile_complete=True).
    """
    return calculate_dynamic_referral_reward()


@method_decorator(ensure_csrf_cookie, name='dispatch')
@method_decorator(csrf_protect, name='dispatch')
class SessionLoginView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_scope = 'login'

    def get(self, request):
        return Response(status=status.HTTP_204_NO_CONTENT)

    def post(self, request):
        raw_phone = request.data.get('phone_number')
        password = request.data.get('password')
        phone = normalize_phone_number(raw_phone)

        user = authenticate(request, username=phone, password=password)
        if user is None:
            user = authenticate(request, phone_number=phone, password=password)

        if user is not None:
            if getattr(user, 'is_temporarily_disabled', False):
                user.is_temporarily_disabled = False
                user.save(update_fields=['is_temporarily_disabled'])

            login(request, user)
            return Response({
                "detail": "Authentication successful.",
                "user_id": user.id
            }, status=status.HTTP_200_OK)
        else:
            return Response(
                {"detail": "Invalid phone number or password."},
                status=status.HTTP_401_UNAUTHORIZED
            )


class SessionLogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        logout(request)
        return Response(
            {"detail": "You have been successfully logged out."}, 
            status=status.HTTP_200_OK
        )


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (permissions.AllowAny,)
    serializer_class = RegisterSerializer
    throttle_scope = 'registration'


class CategoryListView(generics.ListAPIView):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = (permissions.AllowAny,)


@method_decorator(ensure_csrf_cookie, name='dispatch')
class UserProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = (permissions.IsAuthenticated,)
    parser_classes = (MultiPartParser, FormParser, JSONParser) 

    def get_object(self):
        return self.request.user

    @transaction.atomic
    def perform_update(self, serializer):
        user = User.objects.select_for_update().get(pk=self.request.user.pk)
        serializer.instance = user
        updated_user = serializer.save()

        if (
            updated_user.is_profile_complete 
            and updated_user.referred_by 
            and User.objects.filter(
                pk=updated_user.pk,
                has_rewarded_referrer=False
            ).update(has_rewarded_referrer=True)
        ):
            referrer = User.objects.select_for_update().get(pk=updated_user.referred_by.pk)
            reward_amount = get_current_referral_reward()
            
            referrer.wallet_balance = Decimal(str(referrer.wallet_balance or 0)) + reward_amount
            referrer.save(update_fields=['wallet_balance'])

            TokenTransaction.objects.create(
                user=referrer,
                amount=reward_amount,
                transaction_type='REFERRAL_REWARD',
                description=f"Referral reward for inviting {updated_user.whatsapp_name or updated_user.phone_number}"
            )

            updated_user.has_rewarded_referrer = True


class ChangePasswordView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request, *args, **kwargs):
        user = request.user
        old_password = request.data.get("old_password")
        new_password = request.data.get("new_password")

        if not old_password or not new_password:
            return Response(
                {"detail": "Both current and new passwords are required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not user.check_password(old_password):
            return Response(
                {"detail": "The current password you entered is incorrect."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Enforce settings.AUTH_PASSWORD_VALIDATORS
        try:
            validate_password(new_password, user=user)
        except ValidationError as e:
            return Response(
                {"detail": e.messages},
                status=status.HTTP_400_BAD_REQUEST
            )

        user.set_password(new_password)
        user.save()
        logger.info("Password changed for user_id=%s", user.pk)
        
        update_session_auth_hash(request, user)

        return Response(
            {"detail": "Your password has been successfully updated."},
            status=status.HTTP_200_OK
        )


class RequestPasswordResetView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_scope = 'password_reset'

    def post(self, request):
        email = request.data.get('email')
        if not email:
            return Response({"error": "Email is required"}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.filter(email__iexact=str(email).strip()).first()
        if user:
            token = default_token_generator.make_token(user)
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            reset_link = f"{settings.FRONTEND_URL}/reset-password/{uid}/{token}"
            try:
                send_mail(
                    subject='Reset your Growth Engine password',
                    message=(
                        'Use the link below to reset your password. '
                        'This link expires in 20 minutes.\n\n'
                        f'{reset_link}'
                    ),
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[user.email],
                    fail_silently=False,
                )
            except (SMTPException, OSError):
                logger.exception("Failed to send password reset email")

        return Response(
            {"message": "If an account exists for that email, we've sent a reset link."},
            status=status.HTTP_200_OK
        )


class VerifyPasswordResetTokenView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_scope = 'password_reset_verify'

    def post(self, request):
        uid_b64 = request.data.get('uid')
        token = request.data.get('token')

        try:
            uid = force_str(urlsafe_base64_decode(uid_b64))
            user = User.objects.get(pk=uid)
            if default_token_generator.check_token(user, token):
                return Response({"valid": True}, status=status.HTTP_200_OK)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            pass
            
        return Response({"valid": False}, status=status.HTTP_400_BAD_REQUEST)


class ResetPasswordConfirmView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_scope = 'password_reset'

    def post(self, request):
        token = request.data.get('token')
        uid_b64 = request.data.get('uid') 
        new_password = request.data.get('new_password')

        if not all([token, uid_b64, new_password]):
            return Response({"detail": "Missing required fields"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            uid = force_str(urlsafe_base64_decode(uid_b64))
            user = User.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            return Response({"detail": "Invalid or expired token."}, status=status.HTTP_400_BAD_REQUEST)

        if default_token_generator.check_token(user, token):
            # Enforce settings.AUTH_PASSWORD_VALIDATORS
            try:
                validate_password(new_password, user=user)
            except ValidationError as e:
                return Response({"detail": e.messages}, status=status.HTTP_400_BAD_REQUEST)

            user.set_password(new_password)
            user.save()
            logger.info("Password reset completed for user_id=%s", user.pk)
            return Response({"message": "Password updated successfully"}, status=status.HTTP_200_OK)
        
        return Response({"detail": "Invalid or expired token."}, status=status.HTTP_400_BAD_REQUEST)


class DisableAccountView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request, *args, **kwargs):
        user = request.user
        
        # 1. Flag the account as disabled
        user.is_temporarily_disabled = True
        user.save(update_fields=['is_temporarily_disabled'])
        logger.info("Account disabled for user_id=%s", user.pk)
        
        # 2. Iterate through all active sessions in the database and delete the ones belonging to this user
        for session in Session.objects.filter(expire_date__gte=timezone.now()):
            session_data = session.get_decoded()
            if str(user.pk) == str(session_data.get('_auth_user_id')):
                session.delete()

        # 3. Ensure the current request's session is completely flushed
        logout(request)

        return Response(
            {"detail": "Your account has been temporarily disabled across all devices. Logging in again will reactivate it."},
            status=status.HTTP_200_OK
        )


class DeleteAccountView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def delete(self, request, *args, **kwargs):
        user = request.user
        
        if user.is_superuser or user.is_staff:
            return Response(
                {"detail": "Administrator accounts cannot be deleted through this endpoint."},
                status=status.HTTP_403_FORBIDDEN
            )

        user_id = user.pk
        logout(request)
        user.delete() 
        logger.info("Account deleted for user_id=%s", user_id)

        return Response(
            {"detail": "Your account has been permanently deleted."},
            status=status.HTTP_200_OK
        )