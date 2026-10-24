import re
import json
from typing import Optional, Dict, Any, Tuple, List
from datetime import timedelta
from decimal import Decimal
from django.conf import settings
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from django.contrib.auth import get_user_model
from .models import QueueRequest, MatchBatch, UnlockedContact
from accounts.models import Category, TokenTransaction

User = get_user_model()


def _matches_request_filters(queue_request: QueueRequest, profile: Any) -> bool:
    filters = (
        ('target_gender', 'gender', False),
        ('target_country', 'location_country', True),
        ('target_state', 'location_state_county', True),
        ('target_age_range', 'age_range', False),
    )
    for request_field, profile_field, case_insensitive in filters:
        requested_value = getattr(queue_request, request_field, None)
        if not requested_value or requested_value == 'ANY':
            continue
        profile_value = getattr(profile, profile_field, None) or ''
        if case_insensitive:
            if requested_value.strip().casefold() != profile_value.strip().casefold():
                return False
        elif requested_value != profile_value:
            return False
    return True


def get_platform_phase() -> Tuple[str, int]:
    active_user_qs = User.objects.filter(is_active=True, is_profile_complete=True)
    if hasattr(User, 'is_temporarily_disabled'):
        active_user_qs = active_user_qs.filter(is_temporarily_disabled=False)

    total_active = active_user_qs.count()

    tiers = getattr(settings, 'GROWTH_TIERS', {})
    p1 = tiers.get('PHASE_1_BOOTSTRAP', {})
    p2 = tiers.get('PHASE_2_VIRAL_LOOP', {})
    p3 = tiers.get('PHASE_3_SOFT_CASH', {})

    if total_active < p1.get('max_users', 500):
        return "PHASE_1_BOOTSTRAP", total_active
    elif total_active < p2.get('max_users', 1000):
        return "PHASE_2_VIRAL_LOOP", total_active
    elif total_active < p3.get('max_users', 3000):
        return "PHASE_3_SOFT_CASH", total_active
    else:
        return "PHASE_4_SQUEEZED", total_active


def get_queue_request_pricing_phase(queue_request: Optional[QueueRequest]) -> str:
    if queue_request and queue_request.ready_phase:
        return queue_request.ready_phase
    if queue_request and queue_request.status in {'matched', 'completed'}:
        return 'PHASE_1_BOOTSTRAP'
    return get_platform_phase()[0]


def get_current_referral_reward() -> Decimal:
    phase, _ = get_platform_phase()
    tiers = getattr(settings, 'GROWTH_TIERS', {})
    tier_info = tiers.get(phase, {})
    return Decimal(str(tier_info.get('referral_reward_tokens', '10.00')))


def check_pool_unlock_status() -> Dict[str, Any]:
    WINDOW_MINUTES = 30
    BATCH_THRESHOLD = 3
    JOIN_THRESHOLD = 50
    FILTERED_USER_THRESHOLD = 1000

    time_threshold = timezone.now() - timedelta(minutes=WINDOW_MINUTES)

    recent_batches = MatchBatch.objects.filter(created_at__gte=time_threshold).count()
    recent_joins = QueueRequest.objects.filter(created_at__gte=time_threshold).count()

    phase, total_active_users = get_platform_phase()
    referral_reward = get_current_referral_reward()
    reward_int = int(referral_reward) if referral_reward else 0
    referrals_needed_20 = (20 // reward_int) if reward_int > 0 else 0

    is_100_unlocked = recent_batches >= BATCH_THRESHOLD or recent_joins >= JOIN_THRESHOLD
    is_filtered_unlocked = total_active_users >= FILTERED_USER_THRESHOLD

    tiers = getattr(settings, 'GROWTH_TIERS', {})
    tier_info = tiers.get(phase, {})
    base_price_20 = float(tier_info.get('base_price_20_kes', 0.0))
    base_price_100 = float(tier_info.get('base_price_100_kes', 0.0))

    return {
        "pool_20_active": True,
        "pool_100_unlocked": is_100_unlocked,
        "is_filtered_unlocked": is_filtered_unlocked,
        "total_active_users": total_active_users,
        "required_filtered_users": FILTERED_USER_THRESHOLD,
        "recent_batches": recent_batches,
        "recent_joins": recent_joins,
        "window_minutes": WINDOW_MINUTES,
        "current_phase": phase,
        "referral_reward": float(referral_reward),
        "referrals_needed_for_20_batch": referrals_needed_20,
        "base_price_20_kes": base_price_20,
        "base_price_100_kes": base_price_100,
        "is_free_tier": (base_price_20 == 0.0),
    }


class DownloadCheckoutEngine:

    @staticmethod
    def get_batch_fiat_price(current_phase: str, target_size: int = 20, pool_type: str = 'normal') -> Decimal:
        tiers = getattr(settings, 'GROWTH_TIERS', {})
        tier_info = tiers.get(current_phase, {})
        if target_size in [100, 101]:
            base_price = Decimal(str(tier_info.get('base_price_100_kes', '0.00')))
        else:
            base_price = Decimal(str(tier_info.get('base_price_20_kes', '0.00')))

        if pool_type == 'filtered':
            return base_price * Decimal('2.00')
        return base_price

    @classmethod
    def calculate_checkout_breakdown(cls, user: Any, current_phase: str, target_size: int = 20, pool_type: str = 'normal') -> Dict[str, Any]:
        multiplier = 2 if pool_type == 'filtered' else 1
        base_token_cost = getattr(settings, 'DEFAULT_100_BATCH_TOKEN_COST', 100) if target_size in [100, 101] else getattr(settings, 'DEFAULT_20_BATCH_TOKEN_COST', 20)
        full_token_cost = base_token_cost * multiplier
        full_cash_price = cls.get_batch_fiat_price(current_phase, target_size=target_size, pool_type=pool_type)

        account_token_balance = getattr(
            user,
            'wallet_balance',
            getattr(user, 'referral_tokens', 0),
        ) or 0
        if getattr(user, 'pk', None):
            from django.db.models import Sum
            from payments.models import MpesaTransaction

            account_token_balance = User.objects.filter(pk=user.pk).values_list(
                'wallet_balance',
                flat=True,
            ).first() or 0
            reserved_tokens = MpesaTransaction.objects.filter(
                user_id=user.pk,
                status='PENDING',
            ).aggregate(total=Sum('tokens_used'))['total'] or 0
        else:
            reserved_tokens = 0

        user_tokens = max(0, int(account_token_balance) - int(reserved_tokens))
        
        if full_cash_price == 0:
            tokens_to_apply = 0
            discount_amount = Decimal("0.00")
            net_cash_required = Decimal("0.00")
        else:
            tokens_to_apply = min(user_tokens, full_token_cost)
            token_unit_cash_value = full_cash_price / Decimal(str(full_token_cost))
            discount_amount = Decimal(str(tokens_to_apply)) * token_unit_cash_value
            net_cash_required = max(Decimal("0.00"), full_cash_price - discount_amount)

        formatted_phase = current_phase.replace('_', ' ').title() if current_phase else ""

        return {
            "phase": formatted_phase,
            "current_phase": current_phase,
            "base_price": float(full_cash_price),
            "full_cash_price": float(full_cash_price),
            "base_price_kes": float(full_cash_price),
            "tokens_used": tokens_to_apply,
            "discount_amount": float(discount_amount),
            "token_discount_cash": float(discount_amount),
            "discount": float(discount_amount),
            "referral_discount": float(discount_amount),
            "token_discount": float(discount_amount),
            "discount_cash": float(discount_amount),
            "discount_kes": float(discount_amount),
            "token_discount_amount": float(discount_amount),
            "net_cash_required": float(net_cash_required),
            "net_amount": float(net_cash_required),
            "is_fully_covered_by_tokens": (net_cash_required == 0),
            "is_free_or_token_covered": (net_cash_required == 0),
            "target_size": target_size,
            "full_token_cost": full_token_cost,
            "account_token_balance": int(account_token_balance),
            "reserved_tokens": int(reserved_tokens),
            "available_tokens": user_tokens,
            "pool_type": pool_type
        }

    @classmethod
    @transaction.atomic
    def finalize_vcf_unlock(cls, user: Any, checkout_breakdown: Dict[str, Any], payment_reference: str = "FREE_OR_TOKEN_COVERED") -> bool:
        tokens_used = checkout_breakdown.get('tokens_used', 0)

        if tokens_used > 0:
            user_db = User.objects.select_for_update().get(pk=user.pk)
            token_field = 'wallet_balance' if hasattr(user_db, 'wallet_balance') else 'referral_tokens'
            current_tokens = Decimal(str(getattr(user_db, token_field, 0) or 0))

            if current_tokens < tokens_used:
                raise ValueError("400:Referral token balance changed. Please re-try checkout.")

            new_balance = current_tokens - Decimal(str(tokens_used))
            setattr(user_db, token_field, new_balance)
            user_db.save(update_fields=[token_field])
            
            setattr(user, token_field, new_balance)

            TokenTransaction.objects.create(
                user=user_db,
                amount=-Decimal(str(tokens_used)),
                transaction_type='POOL_SPEND',
                description=f"Applied {tokens_used} referral tokens as discount on VCF download ({payment_reference})."
            )

        return True


def generate_vcf_from_users(users: List[Any], pool_type: str = 'normal') -> str:
    if not users:
        return ""

    def escape_vcard_text(value: Any) -> str:
        text = str(value or "")
        return (
            text.replace('\\', '\\\\')
                .replace('\r\n', '\n')
                .replace('\r', '\n')
                .replace('\n', '\\n')
                .replace(';', '\\;')
                .replace(',', '\\,')
        )

    vcf_entries = []
    is_filtered = (pool_type == 'filtered')

    for u in users:
        whatsapp_name = (u.whatsapp_name or "Contact").strip()
        first_name = (getattr(u, 'first_name', '') or "").strip()
        last_name = (getattr(u, 'last_name', '') or "").strip()

        formatted_name = whatsapp_name
        n_first = first_name or whatsapp_name
        n_last = last_name
        name_structure = f"{escape_vcard_text(n_last)};{escape_vcard_text(n_first)};;;"

        phone_clean = re.sub(r'\D', '', str(u.phone_number))
        phone_formatted = f"+{phone_clean}" if phone_clean else ""

        category_name = u.category.name if getattr(u, 'category', None) else "General"
        country = u.location_country.strip() if getattr(u, 'location_country', None) else ""

        if is_filtered:
            note_lines = []
            if getattr(u, 'bio', None):
                note_lines.append(f"Business: {u.bio.strip()}")
            if category_name:
                note_lines.append(f"Category: {category_name}")

            location_parts = []
            if getattr(u, 'location_state_county', None):
                location_parts.append(u.location_state_county.strip())
            if country:
                location_parts.append(country)
            if location_parts:
                note_lines.append(f"Location: {', '.join(location_parts)}")

            gender_display = u.get_gender_display() if hasattr(u, 'get_gender_display') else getattr(u, 'gender', None)
            age_range = getattr(u, 'age_range', None)
            if gender_display or age_range:
                demo_parts = []
                if gender_display:
                    demo_parts.append(f"Gender: {gender_display}")
                if age_range:
                    demo_parts.append(f"Age: {age_range}")
                note_lines.append(" | ".join(demo_parts))

            note_lines.append("Connected via Growth Engine")
            raw_note = " \n ".join(note_lines)
        else:
            raw_note = "We believe in building a networked community"

        card = [
            "BEGIN:VCARD",
            "VERSION:3.0",
            f"FN:{escape_vcard_text(formatted_name)}",
            f"N:{name_structure}",
            f"TEL;TYPE=CELL,VOICE:{phone_formatted}",
            f"ORG:{escape_vcard_text('Growth Engine')}",
        ]

        if category_name:
            card.append(f"TITLE:{escape_vcard_text(category_name)}")

        if country:
            card.append(f"ADR;TYPE=WORK:;;;;;;{escape_vcard_text(country)}")

        card.append(f"NOTE:{escape_vcard_text(raw_note)}")
        card.append("END:VCARD")

        vcf_entries.append("\r\n".join(card))

    return "\r\n\r\n".join(vcf_entries) + "\r\n"


def check_and_form_batches() -> None:
    pending_requests = QueueRequest.objects.filter(
        status='pending',
        user__is_active=True,
        user__is_temporarily_disabled=False
    ).order_by('created_at')

    for req in pending_requests:
        req.refresh_from_db()
        if req.status != 'pending':
            continue

        target_size = req.target_size
        category = req.requested_category

        unlocked_by_user = set(
            UnlockedContact.objects.filter(user=req.user).values_list('contact_id', flat=True)
        )
        users_who_unlocked_user = set(
            UnlockedContact.objects.filter(contact=req.user).values_list('user_id', flat=True)
        )
        already_unlocked_ids = unlocked_by_user.union(users_who_unlocked_user)
        already_unlocked_ids.add(req.user_id)

        candidates_qs = QueueRequest.objects.filter(
            requested_category=category,
            target_size=target_size,
            status='pending',
            user__is_active=True,
            user__is_temporarily_disabled=False
        ).exclude(user_id__in=already_unlocked_ids).exclude(id=req.id)

        if req.type == 'filtered':
            if req.target_gender and req.target_gender != 'ANY':
                candidates_qs = candidates_qs.filter(user__gender=req.target_gender)
            if req.target_country:
                candidates_qs = candidates_qs.filter(user__location_country__iexact=req.target_country.strip())
            if req.target_state:
                candidates_qs = candidates_qs.filter(user__location_state_county__iexact=req.target_state.strip())
            if req.target_age_range:
                candidates_qs = candidates_qs.filter(user__age_range=req.target_age_range)

        u_profile = req.user
        candidates_qs = candidates_qs.filter(
            Q(type='normal') | (
                Q(type='filtered') &
                (Q(target_gender__isnull=True) | Q(target_gender='ANY') | Q(target_gender='') | Q(target_gender=getattr(u_profile, 'gender', None))) &
                (Q(target_country__isnull=True) | Q(target_country='') | Q(target_country__iexact=getattr(u_profile, 'location_country', ''))) &
                (Q(target_state__isnull=True) | Q(target_state='') | Q(target_state__iexact=getattr(u_profile, 'location_state_county', ''))) &
                (Q(target_age_range__isnull=True) | Q(target_age_range='') | Q(target_age_range=getattr(u_profile, 'age_range', '')))
            )
        )

        needed_peers = target_size - 1
        if candidates_qs.count() >= needed_peers:
            with transaction.atomic():
                locked_req = QueueRequest.objects.select_for_update(skip_locked=True).filter(
                    id=req.id, status='pending'
                ).first()
                
                if not locked_req:
                    continue

                batch_members = [locked_req]
                selected_peers = []
                compatible_candidates = candidates_qs.filter(status='pending').order_by(
                    'created_at', 'id'
                ).select_for_update(skip_locked=True)

                for candidate in compatible_candidates:
                    if all(
                        _matches_request_filters(member, candidate.user)
                        and _matches_request_filters(candidate, member.user)
                        for member in batch_members
                    ):
                        selected_peers.append(candidate)
                        batch_members.append(candidate)
                        if len(selected_peers) == needed_peers:
                            break

                if len(selected_peers) < needed_peers:
                    continue

                ready_phase, _ = get_platform_phase()
                new_batch = MatchBatch.objects.create(is_ready=True)

                for member in batch_members:
                    member.status = 'matched'
                    member.batch = new_batch
                    member.ready_phase = ready_phase
                    member.save(update_fields=['status', 'batch', 'ready_phase'])


class MatchingEngine:

    @staticmethod
    def get_current_referral_reward() -> Decimal:
        return get_current_referral_reward()

    @classmethod
    @transaction.atomic
    def award_referral_bonus(cls, referred_user: Any) -> Tuple[Optional[TokenTransaction], str]:
        referrer = getattr(referred_user, 'referred_by', None)
        if not referrer:
            return None, "No referrer found."

        already_rewarded = TokenTransaction.objects.filter(
            user=referrer,
            transaction_type='REFERRAL_REWARD',
            description__icontains=str(referred_user.id)
        ).exists()

        if already_rewarded:
            return None, "Referral reward already granted for this user."

        reward_tokens = get_current_referral_reward()
        reward_dec = Decimal(str(reward_tokens))

        referrer_db = User.objects.select_for_update().get(pk=referrer.pk)
        token_field = 'wallet_balance' if hasattr(referrer_db, 'wallet_balance') else 'referral_tokens'
        current_bal = Decimal(str(getattr(referrer_db, token_field, 0) or 0))

        setattr(referrer_db, token_field, current_bal + reward_dec)
        referrer_db.save(update_fields=[token_field])

        txn = TokenTransaction.objects.create(
            user=referrer_db,
            amount=reward_dec,
            transaction_type='REFERRAL_REWARD',
            description=f"Earned {reward_tokens} tokens for referring user ID {referred_user.id}"
        )

        return txn, f"Awarded {reward_tokens} tokens to referrer."

    @staticmethod
    def check_pool_gating(user: Any) -> Tuple[bool, str, int]:
        pending_or_matched = QueueRequest.objects.filter(
            user=user,
            status__in=['pending', 'matched']
        ).order_by('created_at', 'id').first()

        if pending_or_matched:
            if pending_or_matched.status == 'pending':
                return False, "You are already in the queue. Please wait for matches.", 400
            if pending_or_matched.status == 'matched':
                return False, "You must download your previous VCF contact batch before joining a new pool.", 403

        return True, "Eligible", 200

    @classmethod
    @transaction.atomic
    def process_pool_entry(cls, user: Any, target_size: int = 20, pool_type: str = 'normal', category_id: Optional[int] = None, filters: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        user = User.objects.select_for_update().get(pk=user.pk)
        can_join, message, status_code = cls.check_pool_gating(user)
        if not can_join:
            raise ValueError(f"{status_code}:{message}")

        try:
            raw_target = int(target_size)
        except (ValueError, TypeError):
            raise ValueError("400:Target must be 20 or 100 contacts.")

        if raw_target not in (20, 21, 100, 101):
            raise ValueError("400:Target must be 20 or 100 contacts.")
        if pool_type not in ('normal', 'filtered'):
            raise ValueError("400:Pool type must be normal or filtered.")

        actual_target = 21 if raw_target in [20, 21] else 101
        filters = filters or {}

        status_info = check_pool_unlock_status()
        if actual_target == 101 and not status_info['pool_100_unlocked']:
            raise ValueError(
                f"403:The 100-contact pool is locked. It unlocks automatically during high platform traffic "
                f"({status_info['recent_joins']}/50 joins or {status_info['recent_batches']}/3 batches in last 30 mins)."
            )

        category_to_match = None
        if category_id:
            try:
                category_to_match = Category.objects.get(id=category_id)
            except Category.DoesNotExist:
                raise ValueError("400:Invalid category selected.")
        else:
            category_to_match = user.category
            if not category_to_match:
                raise ValueError("400:Please select a business category to continue.")

        phase, total_active_users = get_platform_phase()

        if pool_type == 'filtered' and total_active_users < 1000:
            raise ValueError(f"403:Targeted matching unlocks automatically at 1,000 completed profiles ({total_active_users}/1,000 ready).")

        queue_request = QueueRequest.objects.create(
            user=user,
            requested_category=category_to_match,
            target_size=actual_target,
            type=pool_type,
            status='pending',
            target_gender=filters.get('gender') if pool_type == 'filtered' else None,
            target_country=filters.get('country') if pool_type == 'filtered' else None,
            target_state=filters.get('state_county') if pool_type == 'filtered' else None,
            target_age_range=filters.get('age_range') if pool_type == 'filtered' else None,
        )

        check_and_form_batches()

        queue_request.refresh_from_db()
        token_field = 'wallet_balance' if hasattr(user, 'wallet_balance') else 'referral_tokens'
        user_bal = float(getattr(user, token_field, 0) or 0)

        if queue_request.status == 'matched':
            return {
                "message": "Match successful! Your batch is ready for download.",
                "status": "matched",
                "batch_id": str(queue_request.batch.batch_id),
                "new_balance": user_bal
            }

        current_count = QueueRequest.objects.filter(
            requested_category=category_to_match,
            target_size=actual_target,
            status='pending'
        ).count()

        return {
            "message": f"Joined the {actual_target - 1} pool queue. We'll notify you when your batch is ready.",
            "status": "pending",
            "queue_id": queue_request.id,
            "current": current_count,
            "new_balance": user_bal
        }

    @classmethod
    @transaction.atomic
    def get_user_vcf_content(cls, user: Any, batch: Any, pool_type: str = 'normal') -> str:
        from payments.models import MpesaTransaction

        queue_req = QueueRequest.objects.filter(batch=batch, user=user).first()
        phase = get_queue_request_pricing_phase(queue_req)
        target_size = queue_req.target_size - 1 if queue_req and queue_req.target_size else 20
        actual_pool_type = queue_req.type if queue_req else pool_type

        breakdown = DownloadCheckoutEngine.calculate_checkout_breakdown(
            user=user,
            current_phase=phase,
            target_size=target_size,
            pool_type=actual_pool_type
        )

        completed_mpesa_tx = MpesaTransaction.objects.filter(
            user=user,
            target_batch_id__in=[str(batch.batch_id), str(batch.id)],
            status='COMPLETED'
        ).first()

        has_completed_payment = completed_mpesa_tx is not None
        is_already_completed = (queue_req and queue_req.status == 'completed')

        is_unlocked = (
            has_completed_payment or
            is_already_completed or
            breakdown['is_fully_covered_by_tokens']
        )

        if not is_unlocked:
            err_payload = {
                "message": f"Payment required: KES {breakdown['net_cash_required']:.2f} via M-Pesa.",
                "breakdown": breakdown
            }
            raise ValueError(f"402:{json.dumps(err_payload)}")

        matched_peers = QueueRequest.objects.filter(
            batch=batch,
            user__is_active=True,
            user__is_temporarily_disabled=False
        ).exclude(user=user)
        matched_users = [peer.user for peer in matched_peers]

        already_unlocked_ids = set(
            UnlockedContact.objects.filter(user=user).values_list('contact_id', flat=True)
        )

        pending_bonus_contacts = list(User.objects.filter(
            is_always_injected=True,
            is_active=True,
            is_temporarily_disabled=False
        ).exclude(id=user.id).exclude(id__in=already_unlocked_ids))

        all_batch_contacts = list({u.id: u for u in matched_users + pending_bonus_contacts}.values())

        if not all_batch_contacts:
            raise ValueError("400:No valid contacts found in this match batch.")

        new_contacts = [u for u in all_batch_contacts if u.id not in already_unlocked_ids]

        if new_contacts:
            if completed_mpesa_tx:
                ref_str = completed_mpesa_tx.mpesa_receipt_number or "MPESA_COMPLETED"
            elif breakdown['is_fully_covered_by_tokens']:
                ref_str = "TOKEN_FULL_COVERAGE"
            else:
                ref_str = "FREE_BOOTSTRAP"

            DownloadCheckoutEngine.finalize_vcf_unlock(user=user, checkout_breakdown=breakdown, payment_reference=ref_str)

            new_unlocks = [UnlockedContact(user=user, contact=u) for u in new_contacts]
            UnlockedContact.objects.bulk_create(new_unlocks, ignore_conflicts=True)

        if queue_req and queue_req.status != 'completed':
            queue_req.status = 'completed'
            queue_req.save(update_fields=['status'])

        return generate_vcf_from_users(all_batch_contacts, pool_type=actual_pool_type)