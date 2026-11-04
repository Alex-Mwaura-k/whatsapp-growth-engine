import logging
from decimal import Decimal

from django.contrib import admin
from django.contrib.auth import get_user_model
from django.contrib.auth.decorators import user_passes_test
from django.db.models import Count, Sum
from django.db.models.functions import Lower, TruncDate
from django.shortcuts import render
from django.utils import timezone
from datetime import timedelta
from django.views.decorators.cache import never_cache

from accounts.models import Category, TokenTransaction
from matchmaker.models import MatchBatch, QueueRequest
from payments.models import MpesaTransaction

logger = logging.getLogger('security.audit')
User = get_user_model()

GENDER_LABELS = dict(User.GENDER_CHOICES)
NOT_SET = 'Not set'


def _bars(rows, limit=None):
    """Turns (label, count) pairs into rows with a percentage width for CSS bars."""
    rows = [(label, count) for label, count in rows]
    if limit:
        rows = rows[:limit]
    top = max((count for _, count in rows), default=0) or 1
    total = sum(count for _, count in rows) or 1
    return [
        {
            'label': label,
            'count': count,
            'width': round(count / top * 100),
            'share': round(count / total * 100, 1),
        }
        for label, count in rows
    ]


def _grouped(queryset, field, labels=None):
    rows = queryset.values(field).annotate(n=Count('id')).order_by('-n')
    result = []
    for row in rows:
        value = row[field]
        label = labels.get(value, value) if labels else value
        result.append((label or NOT_SET, row['n']))
    return result


def _daily(queryset, date_field, days, value=None):
    start = timezone.now() - timedelta(days=days - 1)
    aggregate = Sum(value) if value else Count('id')
    rows = (
        queryset.filter(**{f'{date_field}__gte': start.replace(hour=0, minute=0, second=0, microsecond=0)})
        .annotate(day=TruncDate(date_field))
        .values('day')
        .annotate(total=aggregate)
    )
    by_day = {row['day']: row['total'] or 0 for row in rows}
    series = []
    for offset in range(days):
        day = (timezone.localdate() - timedelta(days=days - 1 - offset))
        series.append((day.strftime('%d %b'), by_day.get(day, 0)))
    return _bars(series)


def _money(value):
    return (value or Decimal('0.00')).quantize(Decimal('0.01'))


def build_stats():
    now = timezone.now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)

    users = User.objects.filter(is_superuser=False)
    total_users = users.count()
    complete = users.filter(is_profile_complete=True).count()

    paid = MpesaTransaction.objects.filter(status='COMPLETED')

    def revenue_since(since=None):
        qs = paid if since is None else paid.filter(created_at__gte=since)
        return _money(qs.aggregate(total=Sum('amount'))['total'])

    payment_counts = dict(
        MpesaTransaction.objects.values_list('status').annotate(n=Count('id'))
    )
    paid_count = payment_counts.get('COMPLETED', 0)
    attempts = sum(payment_counts.values())

    queue = QueueRequest.objects.all()
    queue_status = dict(queue.values_list('status').annotate(n=Count('id')))

    token_rows = TokenTransaction.objects.values('transaction_type').annotate(
        n=Count('id'), total=Sum('amount')
    )
    token_labels = dict(TokenTransaction.TRANSACTION_TYPES)

    top_referrers = (
        User.objects.annotate(n=Count('referrals'))
        .filter(n__gt=0)
        .order_by('-n')
        .values_list('whatsapp_name', 'n')[:5]
    )

    return {
        'generated_at': now,
        'users': {
            'total': total_users,
            'active': users.filter(is_active=True, is_temporarily_disabled=False).count(),
            'disabled': users.filter(is_temporarily_disabled=True).count(),
            'profile_complete': complete,
            'completion_rate': round(complete / total_users * 100, 1) if total_users else 0,
            'today': users.filter(date_joined__gte=today_start).count(),
            'week': users.filter(date_joined__gte=week_ago).count(),
            'month': users.filter(date_joined__gte=month_ago).count(),
            'logged_in_week': users.filter(last_login__gte=week_ago).count(),
            'referred': users.filter(referred_by__isnull=False).count(),
            'signups_per_day': _daily(users, 'date_joined', 14),
        },
        'demographics': {
            'gender': _bars(_grouped(users, 'gender', GENDER_LABELS)),
            'age': _bars(_grouped(users, 'age_range')),
            'country': _bars(
                [
                    (label.title() if label != NOT_SET else label, n)
                    for label, n in _grouped(
                        users.annotate(country=Lower('location_country')), 'country'
                    )
                ],
                limit=15,
            ),
            'state': _bars(_grouped(users, 'location_state_county'), limit=15),
            'category': _bars(
                _grouped(users.filter(category__isnull=False).annotate(cat=Lower('category__name')), 'cat'),
                limit=15,
            ),
        },
        'revenue': {
            'total': revenue_since(),
            'today': revenue_since(today_start),
            'week': revenue_since(week_ago),
            'month': revenue_since(month_ago),
            'paid_count': paid_count,
            'attempts': attempts,
            'failed': payment_counts.get('FAILED', 0) + payment_counts.get('CANCELLED', 0),
            'pending': payment_counts.get('PENDING', 0),
            'success_rate': round(paid_count / attempts * 100, 1) if attempts else 0,
            'average': _money(revenue_since() / paid_count) if paid_count else Decimal('0.00'),
            'tokens_used_as_discount': paid.aggregate(n=Sum('tokens_used'))['n'] or 0,
            'per_day': _daily(paid, 'created_at', 14, value='amount'),
        },
        'pools': {
            'by_status': _bars(
                [(dict(QueueRequest.STATUS_CHOICES).get(k, k), v) for k, v in sorted(queue_status.items(), key=lambda i: -i[1])]
            ),
            'by_type': _bars(_grouped(queue, 'type')),
            'batches': MatchBatch.objects.count(),
            'waiting': queue_status.get('pending', 0),
            'downloads': User.objects.aggregate(n=Sum('total_downloads'))['n'] or 0,
        },
        'tokens': {
            'outstanding': _money(User.objects.aggregate(n=Sum('wallet_balance'))['n']),
            'by_type': [
                {
                    'label': token_labels.get(row['transaction_type'], row['transaction_type']),
                    'count': row['n'],
                    'total': _money(row['total']),
                }
                for row in token_rows
            ],
            'top_referrers': list(top_referrers),
        },
        'categories_total': Category.objects.count(),
    }


@never_cache
@user_passes_test(lambda u: u.is_active and u.is_superuser, login_url='/admin/login/')
def stats_dashboard(request):
    logger.info('Stats dashboard viewed by user_id=%s', request.user.pk)
    context = {
        **admin.site.each_context(request),
        'title': 'Growth Engine stats',
        'stats': build_stats(),
    }
    return render(request, 'admin/stats.html', context)
