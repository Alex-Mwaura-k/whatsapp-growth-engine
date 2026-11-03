import json
import logging
import threading
from urllib.parse import urlsplit

from django.conf import settings
from django.db import connections

logger = logging.getLogger('security.audit')

# The server POSTs to subscriber-supplied URLs, so only real push services are allowed.
ALLOWED_PUSH_HOSTS = (
    'fcm.googleapis.com',
    'push.services.mozilla.com',
    'push.apple.com',
    'notify.windows.com',
)


def is_allowed_push_endpoint(endpoint):
    try:
        parts = urlsplit(endpoint)
    except ValueError:
        return False
    host = (parts.hostname or '').lower()
    if parts.scheme != 'https' or parts.username or parts.password:
        return False
    return any(host == allowed or host.endswith('.' + allowed) for allowed in ALLOWED_PUSH_HOSTS)


def push_enabled():
    return bool(settings.VAPID_PUBLIC_KEY and settings.VAPID_PRIVATE_KEY)


def _send_batch_ready(user_ids):
    from pywebpush import webpush, WebPushException
    from .models import PushSubscription, QueueRequest

    try:
        subscriptions = PushSubscription.objects.filter(
            user_id__in=user_ids,
            user__is_active=True,
            user__is_temporarily_disabled=False,
        )
        counts = {}
        for sub in subscriptions:
            if sub.user_id not in counts:
                counts[sub.user_id] = QueueRequest.objects.filter(
                    user_id=sub.user_id, status='matched'
                ).count()
            payload = json.dumps({
                'title': 'Your contacts are ready',
                'body': 'A new contact bundle is ready to download.',
                'url': '/download',
                'count': counts[sub.user_id],
            })
            try:
                webpush(
                    subscription_info={
                        'endpoint': sub.endpoint,
                        'keys': {'p256dh': sub.p256dh, 'auth': sub.auth},
                    },
                    data=payload,
                    vapid_private_key=settings.VAPID_PRIVATE_KEY,
                    vapid_claims={'sub': settings.VAPID_ADMIN_EMAIL},
                    ttl=24 * 60 * 60,
                    timeout=10,
                )
            except WebPushException as exc:
                status_code = getattr(exc.response, 'status_code', None)
                if status_code in (404, 410):
                    sub.delete()
                else:
                    logger.warning('Push delivery failed with status %s', status_code)
            except Exception:
                logger.exception('Unexpected push delivery error')
    finally:
        connections.close_all()


def notify_batch_ready(user_ids):
    """Fire-and-forget so a slow push service never blocks the matching request."""
    if not push_enabled() or not user_ids:
        return
    threading.Thread(
        target=_send_batch_ready, args=(list(user_ids),), daemon=True
    ).start()
