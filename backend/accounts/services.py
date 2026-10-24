import uuid
from decimal import Decimal
from django.conf import settings
from django.db import transaction
from django.contrib.auth import get_user_model

User = get_user_model()


def calculate_dynamic_referral_reward():
    """
    Retrieves dynamic referral reward tokens directly from settings.GROWTH_TIERS
    based on the total number of active, complete profiles on the platform.
    """
    active_users = User.objects.filter(is_active=True, is_profile_complete=True).count()
    tiers = getattr(settings, 'GROWTH_TIERS', {})

    p1 = tiers.get('PHASE_1_BOOTSTRAP', {})
    p2 = tiers.get('PHASE_2_VIRAL_LOOP', {})
    p3 = tiers.get('PHASE_3_SOFT_CASH', {})
    p4 = tiers.get('PHASE_4_SQUEEZED', {})

    if active_users < p1.get('max_users', 500):
        return Decimal(str(p1.get('referral_reward_tokens', '10.00')))
    elif active_users < p2.get('max_users', 1000):
        return Decimal(str(p2.get('referral_reward_tokens', '10.00')))
    elif active_users < p3.get('max_users', 3000):
        return Decimal(str(p3.get('referral_reward_tokens', '2.00')))
    else:
        return Decimal(str(p4.get('referral_reward_tokens', '1.00')))


def generate_unique_referral_code(user):
    """
    Generates a concise, unique referral code for a user if one does not exist.
    """
    if not user.referral_code:
        prefix = (user.whatsapp_name or "REF").replace(" ", "").upper()[:4]
        unique_suffix = str(uuid.uuid4()).replace("-", "")[:6].upper()
        user.referral_code = f"{prefix}{unique_suffix}"
        user.save(update_fields=['referral_code'])
    return user.referral_code


@transaction.atomic
def process_user_registration_rewards(new_user, referrer_code=None):
    """
    Executes onboarding attribution:
    1. Ensures new user has a unique referral code.
    2. Binds referred_by attribution (Reward tokens are credited to referrer when user completes profile).
    """
    generate_unique_referral_code(new_user)

    # Process Referrer Attribution (Payout handled upon profile completion in UserProfileView)
    if referrer_code:
        referrer = User.objects.filter(referral_code__iexact=referrer_code.strip()).first()
        if referrer and referrer != new_user:
            if hasattr(new_user, 'referred_by') and not new_user.referred_by:
                new_user.referred_by = referrer
                new_user.save(update_fields=['referred_by'])

    return {
        "new_user_balance": float(new_user.wallet_balance or 0),
        "referral_code": new_user.referral_code
    }