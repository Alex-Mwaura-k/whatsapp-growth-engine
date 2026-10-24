import json
import re
from datetime import timedelta
from decimal import Decimal
from django.http import HttpResponse
from django.conf import settings
from django.db import transaction
from django.utils import timezone
from django.contrib.auth import get_user_model

from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response

from .models import QueueRequest, MatchBatch, UnlockedContact
from accounts.models import Category

from .services import (
    check_pool_unlock_status,
    generate_vcf_from_users,
    check_and_form_batches,
    get_platform_phase,
    get_queue_request_pricing_phase,
    get_current_referral_reward,
    DownloadCheckoutEngine,
    MatchingEngine
)

User = get_user_model()


class PoolStatusView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request, *args, **kwargs):
        status_data = check_pool_unlock_status()
        if not isinstance(status_data, dict):
            status_data = {}

        try:
            current_phase, _ = get_platform_phase()
            reward_tokens = get_current_referral_reward()
            
            status_data['current_phase'] = current_phase
            status_data['referral_reward_tokens'] = float(reward_tokens)
            status_data['referral_reward'] = float(reward_tokens)
        except Exception:
            status_data['referral_reward_tokens'] = 10.0
            status_data['referral_reward'] = 10.0

        return Response(status_data, status=status.HTTP_200_OK)


class CheckoutPreviewView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request, *args, **kwargs):
        user = request.user
        batch_id = request.query_params.get('batch_id')
        raw_target = request.query_params.get('target', 20)
        pool_type = request.query_params.get('type', 'normal')

        try:
            target_size = int(raw_target)
        except (ValueError, TypeError):
            target_size = 20

        queue_req = None
        if batch_id:
            queue_req = QueueRequest.objects.filter(user=user, batch__batch_id=batch_id).first()
            if not queue_req and str(batch_id).isdigit():
                queue_req = QueueRequest.objects.filter(user=user, pk=int(batch_id)).first()
            
            if queue_req:
                if queue_req.target_size:
                    target_size = queue_req.target_size - 1 if queue_req.target_size in [21, 101] else queue_req.target_size
                if queue_req.type:
                    pool_type = queue_req.type

        phase = get_queue_request_pricing_phase(queue_req)
        breakdown = DownloadCheckoutEngine.calculate_checkout_breakdown(
            user=user,
            current_phase=phase,
            target_size=target_size,
            pool_type=pool_type
        )

        return Response(breakdown, status=status.HTTP_200_OK)


class JoinPoolView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request, *args, **kwargs):
        user = request.user

        if not user.is_profile_complete:
            return Response(
                {"error": "Please finish setting up your profile before joining the queue."},
                status=status.HTTP_403_FORBIDDEN
            )

        pool_type = request.data.get('type', 'normal')
        raw_target = request.data.get('target', 20)
        category_id = request.data.get('category_id')

        try:
            target_size = int(raw_target)
        except (TypeError, ValueError):
            return Response(
                {"error": "Target must be 20 or 100 contacts."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if target_size not in (20, 21, 100, 101):
            return Response(
                {"error": "Target must be 20 or 100 contacts."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if pool_type not in ('normal', 'filtered'):
            return Response(
                {"error": "Pool type must be normal or filtered."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        filters = {
            'gender': request.data.get('gender'),
            'country': request.data.get('country'),
            'state_county': request.data.get('state_county'),
            'age_range': request.data.get('age_range'),
        }

        try:
            result = MatchingEngine.process_pool_entry(
                user=user,
                target_size=target_size,
                pool_type=pool_type,
                category_id=category_id,
                filters=filters
            )
            result['type'] = pool_type
            result['target'] = 20 if target_size in (20, 21) else 100
            return Response(result, status=status.HTTP_201_CREATED)

        except ValueError as e:
            err_str = str(e)
            if ":" in err_str:
                code_str, msg = err_str.split(":", 1)
                try:
                    http_code = int(code_str)
                except ValueError:
                    http_code = status.HTTP_400_BAD_REQUEST
                return Response({"error": msg.strip()}, status=http_code)
            return Response({"error": err_str}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class CurrentMatchView(generics.RetrieveAPIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request, *args, **kwargs):
        check_and_form_batches()

        user = request.user
        batch_id = request.query_params.get('batch_id')

        if batch_id:
            queue_req = QueueRequest.objects.filter(
                user=user,
                batch__batch_id=batch_id
            ).first()
            if not queue_req and str(batch_id).isdigit():
                queue_req = QueueRequest.objects.filter(user=user, pk=int(batch_id)).first()
        else:
            queue_req = QueueRequest.objects.filter(
                user=user,
                status__in=['pending', 'matched']
            ).order_by('created_at', 'id').first()
            if not queue_req:
                queue_req = QueueRequest.objects.filter(
                    user=user,
                    status='completed'
                ).order_by('-created_at').first()

        if not queue_req:
            return Response(
                {"status": "idle", "message": "No active queue or matches found."},
                status=status.HTTP_200_OK
            )

        display_target = 20 if queue_req.target_size == 21 else (100 if queue_req.target_size == 101 else queue_req.target_size - 1)

        if queue_req.status == 'pending':
            current_pool_count = QueueRequest.objects.filter(
                requested_category=queue_req.requested_category,
                target_size=queue_req.target_size,
                status='pending',
                user__is_active=True,
                user__is_temporarily_disabled=False
            ).count()

            return Response({
                "status": "pending",
                "queue_id": queue_req.id,
                "type": getattr(queue_req, 'type', 'normal'),
                "target": display_target,
                "current": current_pool_count,
                "category_id": queue_req.requested_category.id if queue_req.requested_category else None,
                "category_name": queue_req.requested_category.name if queue_req.requested_category else "General"
            }, status=status.HTTP_200_OK)

        batch = queue_req.batch
        if not batch:
            return Response(
                {"status": "idle", "message": "No active batch found."},
                status=status.HTTP_200_OK
            )

        matched_peers = QueueRequest.objects.filter(
            batch=batch,
            user__is_active=True,
            user__is_temporarily_disabled=False
        ).exclude(user=user)
        matched_users = [peer.user for peer in matched_peers]

        already_unlocked_ids = set(
            UnlockedContact.objects.filter(user=user).values_list('contact_id', flat=True)
        )

        injected_users = list(User.objects.filter(
            is_always_injected=True,
            is_active=True,
            is_temporarily_disabled=False
        ).exclude(id=user.id).exclude(id__in=already_unlocked_ids))

        final_preview_list = list({u.id: u for u in matched_users + injected_users}.values())

        # SECURE PREVIEW LIST: Strip data entirely unless paid/completed
        is_unlocked = (queue_req.status == 'completed')
        contacts = []
        for u in final_preview_list:
            if is_unlocked:
                raw_phone = str(u.phone_number) if u.phone_number else ""
                masked_phone = f"{raw_phone[:4]}****{raw_phone[-4:]}" if len(raw_phone) >= 8 else "Hidden"
                full_name = getattr(u, 'whatsapp_name', 'User') or "User"
                display_name = full_name.split()[0] if full_name else "User"
                bio = getattr(u, 'bio', '')
                category = u.category.name if getattr(u, 'category', None) else "General"
            else:
                display_name = "Locked Contact"
                masked_phone = "Hidden"
                bio = "Unlock batch to view bio"
                category = "Hidden"

            contacts.append({
                "display_name": display_name,
                "phone_number": masked_phone,
                "bio": bio,
                "category": category
            })

        return Response({
            "status": queue_req.status,
            "batch_id": str(batch.batch_id),
            "matched_on": batch.created_at.strftime("%Y-%m-%d %H:%M"),
            "contacts": contacts,
            "total_contacts": len(contacts),
            "target": display_target,
            "current": display_target,
            "type": getattr(queue_req, 'type', 'normal'),
            "category_id": queue_req.requested_category.id if queue_req.requested_category else None,
            "category_name": queue_req.requested_category.name if queue_req.requested_category else "General"
        }, status=status.HTTP_200_OK)


class UserBatchesView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request, *args, **kwargs):
        try:
            check_and_form_batches()

            user = request.user

            queue_requests = QueueRequest.objects.filter(
                user=user,
                status__in=['matched', 'completed'],
                batch__isnull=False
            ).select_related('batch', 'requested_category').order_by('-created_at')

            bundles = []
            for req in queue_requests:
                if not req.batch:
                    continue

                cat_name = req.requested_category.name if req.requested_category else "General"
                created_at_dt = getattr(req.batch, 'created_at', None) or req.created_at

                contact_count = req.target_size - 1 if req.target_size else 20
                bundle_name = f"{cat_name} {contact_count}"

                bundles.append({
                    "id": str(req.batch.batch_id),
                    "batch_id": str(req.batch.batch_id),
                    "name": bundle_name,
                    "contact_count": contact_count,
                    "created_at": created_at_dt.isoformat() if created_at_dt else "",
                    "status": req.status,
                    "is_downloaded": (req.status == 'completed')
                })

            return Response(bundles, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class DownloadVCFView(generics.RetrieveAPIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request, *args, **kwargs):
        user = request.user
        batch_id = request.query_params.get('batch_id')

        # Flexible batch and QueueRequest resolution
        queue_req = None
        if batch_id:
            queue_req = QueueRequest.objects.filter(
                user=user,
                batch__batch_id=batch_id
            ).first()
            if not queue_req:
                queue_req = QueueRequest.objects.filter(user=user, batch_id=batch_id).first()
            if not queue_req and str(batch_id).isdigit():
                queue_req = QueueRequest.objects.filter(user=user, pk=int(batch_id)).first() or \
                            QueueRequest.objects.filter(user=user, batch__id=int(batch_id)).first()

        if not queue_req:
            queue_req = QueueRequest.objects.filter(
                user=user,
                status__in=['matched', 'completed']
            ).order_by('-created_at').first()

        if not queue_req or not queue_req.batch:
            return Response(
                {"message": "No matches available for download."},
                status=status.HTTP_404_NOT_FOUND
            )

        batch = queue_req.batch
        pool_type = getattr(queue_req, 'type', 'normal')
        is_first_download = (queue_req.status == 'matched')

        try:
            # FIXED: Do not pass payment_verified or payment_ref from client requests.
            # The engine must verify payment status strictly from the database.
            vcf_content = MatchingEngine.get_user_vcf_content(
                user=user,
                batch=batch,
                pool_type=pool_type
            )
        except ValueError as e:
            err_str = str(e)
            if err_str.startswith("402:"):
                json_part = err_str.split("402:", 1)[1].strip()
                try:
                    payload = json.loads(json_part)
                except json.JSONDecodeError:
                    payload = {"error": json_part}
                return Response(payload, status=status.HTTP_402_PAYMENT_REQUIRED)

            if ":" in err_str:
                code_str, msg = err_str.split(":", 1)
                try:
                    http_code = int(code_str)
                except ValueError:
                    http_code = status.HTTP_400_BAD_REQUEST
                return Response({"error": msg.strip()}, status=http_code)

            return Response({"error": err_str}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        if is_first_download:
            queue_req.status = 'completed'
            queue_req.save(update_fields=['status'])

            if hasattr(user, 'total_downloads'):
                matched_peers_count = QueueRequest.objects.filter(batch=batch).exclude(user=user).count()
                current_downloads = user.total_downloads or 0
                user.total_downloads = current_downloads + matched_peers_count
                user.save(update_fields=['total_downloads'])

        cat_name = queue_req.requested_category.name.replace(' ', '_') if queue_req.requested_category else "General"
        contact_count = queue_req.target_size - 1 if queue_req.target_size else 20
        filename = f"{cat_name}_{contact_count}.vcf"

        response = HttpResponse(vcf_content, content_type='text/vcard; charset=utf-8')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'

        user.refresh_from_db()
        token_field = 'wallet_balance' if hasattr(user, 'wallet_balance') else 'referral_tokens'
        new_balance = float(getattr(user, token_field, 0) or 0)

        response['X-New-Balance'] = new_balance
        response['Access-Control-Expose-Headers'] = 'X-New-Balance'

        return response