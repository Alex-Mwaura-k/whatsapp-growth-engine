import os
from pathlib import Path
from decimal import Decimal
from urllib.parse import urlsplit
from dotenv import load_dotenv
from django.core.exceptions import ImproperlyConfigured

# Locate BASE_DIR and load .env from the backend root directory
BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / '.env')

# Django Core Configurations
DEBUG = os.getenv('DEBUG', 'False').lower() in ['true', '1', 't']
SECRET_KEY = os.getenv('SECRET_KEY')
if not SECRET_KEY:
    if not DEBUG:
        raise ImproperlyConfigured('Set SECRET_KEY in the production environment.')
    SECRET_KEY = 'dev-only-insecure-secret-key'

def env_bool(name, default):
    return os.getenv(name, str(default)).lower() in ['true', '1', 't']


def env_list(name, default):
    value = os.getenv(name)
    if value is None:
        return default
    return [item.strip() for item in value.split(',') if item.strip()]


SECURE_SSL_REDIRECT = env_bool('SECURE_SSL_REDIRECT', not DEBUG)
SECURE_HSTS_SECONDS = int(os.getenv(
    'SECURE_HSTS_SECONDS',
    '0' if DEBUG else '31536000'
))
SECURE_HSTS_INCLUDE_SUBDOMAINS = env_bool('SECURE_HSTS_INCLUDE_SUBDOMAINS', False)
SECURE_HSTS_PRELOAD = env_bool('SECURE_HSTS_PRELOAD', False)
SESSION_COOKIE_SECURE = env_bool('SESSION_COOKIE_SECURE', not DEBUG)
CSRF_COOKIE_SECURE = env_bool('CSRF_COOKIE_SECURE', not DEBUG)

raw_hosts = os.getenv('ALLOWED_HOSTS')
if raw_hosts is None:
    raw_hosts = '127.0.0.1,localhost' if DEBUG else ''
ALLOWED_HOSTS = [host.strip() for host in raw_hosts.split(',') if host.strip()]
if not DEBUG and (not ALLOWED_HOSTS or '*' in ALLOWED_HOSTS):
    raise ImproperlyConfigured('Set a restricted ALLOWED_HOSTS value in production.')

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'corsheaders',
    'matchmaker',
    'accounts',
    'payments',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'core.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'core.wsgi.application'

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Africa/Nairobi'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

AUTH_USER_MODEL = 'accounts.User'

CORS_ALLOW_CREDENTIALS = True
CORS_ALLOWED_ORIGINS = env_list('CORS_ALLOWED_ORIGINS', [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
] if DEBUG else [])

SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'

CSRF_COOKIE_HTTPONLY = False
CSRF_COOKIE_SAMESITE = 'Lax'
CSRF_TRUSTED_ORIGINS = env_list('CSRF_TRUSTED_ORIGINS', [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    "http://localhost:5173",
    "http://127.0.0.1:5173",
] if DEBUG else [])

SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = 'strict-origin-when-cross-origin'
X_FRAME_OPTIONS = 'DENY'

FRONTEND_URL = os.getenv(
    'FRONTEND_URL',
    'http://localhost:5173' if DEBUG else '',
).rstrip('/')
if not DEBUG:
    frontend_url = urlsplit(FRONTEND_URL)
    if (
        frontend_url.scheme != 'https'
        or not frontend_url.netloc
        or frontend_url.username
        or frontend_url.password
        or frontend_url.query
        or frontend_url.fragment
    ):
        raise ImproperlyConfigured('Set FRONTEND_URL to the HTTPS production frontend URL.')
DEFAULT_FROM_EMAIL = os.getenv('DEFAULT_FROM_EMAIL', 'webmaster@localhost')
EMAIL_BACKEND = os.getenv(
    'EMAIL_BACKEND',
    'django.core.mail.backends.console.EmailBackend' if DEBUG
    else 'django.core.mail.backends.smtp.EmailBackend'
)
EMAIL_HOST = os.getenv('EMAIL_HOST', '')
EMAIL_PORT = int(os.getenv('EMAIL_PORT', '587'))
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD', '')
EMAIL_USE_TLS = env_bool('EMAIL_USE_TLS', True)
EMAIL_TIMEOUT = int(os.getenv('EMAIL_TIMEOUT', '10'))

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'security_console': {
            'class': 'logging.StreamHandler',
        },
    },
    'loggers': {
        'security.audit': {
            'handlers': ['security_console'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}

REST_FRAMEWORK = {
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework.authentication.SessionAuthentication',
    ),
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.ScopedRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'registration': '5/hour',
        'login': '5/minute',
        'password_reset': '3/hour',
        'password_reset_verify': '10/hour',
        'payment_initiation': '5/hour',
    },
}
# Expire password reset tokens after 20 minutes
PASSWORD_RESET_TIMEOUT = 1200
LEGAL_TERMS_VERSION = '2026-10-23'
LEGAL_PRIVACY_VERSION = '2026-10-23'

# M-Pesa Configurations (Pulled strictly from .env)
MPESA_ENV = os.getenv('MPESA_ENV', 'sandbox')
MPESA_MOCK_MODE = os.getenv('MPESA_MOCK_MODE', 'False').lower() in ['true', '1', 't']
MPESA_CONSUMER_KEY = os.getenv('MPESA_CONSUMER_KEY', '')
MPESA_CONSUMER_SECRET = os.getenv('MPESA_CONSUMER_SECRET', '')
MPESA_SHORTCODE = os.getenv('MPESA_SHORTCODE', '')
MPESA_PASSKEY = os.getenv('MPESA_PASSKEY', '')
MPESA_CALLBACK_URL = os.getenv('MPESA_CALLBACK_URL', '')

TOKEN_VALUE_KES = Decimal('1.00')

DEFAULT_20_BATCH_TOKEN_COST = 20
DEFAULT_100_BATCH_TOKEN_COST = 100

GROWTH_TIERS = {
    'PHASE_1_BOOTSTRAP': {
        'max_users': 500,
        'referral_reward_tokens': Decimal('10.00'),
        'base_price_20_kes': Decimal('0.00'),
        'base_price_100_kes': Decimal('0.00'),
        'is_cash_required': False,
    },
    'PHASE_2_VIRAL_LOOP': {
        'max_users': 1000,
        'referral_reward_tokens': Decimal('10.00'),
        'base_price_20_kes': Decimal('20.00'),
        'base_price_100_kes': Decimal('100.00'),
        'is_cash_required': False,
    },
    'PHASE_3_SOFT_CASH': {
        'max_users': 3000,
        'referral_reward_tokens': Decimal('2.00'),
        'base_price_20_kes': Decimal('30.00'),
        'base_price_100_kes': Decimal('80.00'),
        'is_cash_required': True,
    },
    'PHASE_4_SQUEEZED': {
        'max_users': float('inf'),
        'referral_reward_tokens': Decimal('1.00'),
        'base_price_20_kes': Decimal('40.00'),
        'base_price_100_kes': Decimal('120.00'),
        'is_cash_required': True,
    }
}