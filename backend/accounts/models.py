import os
import re
import uuid
import secrets
import string
from decimal import Decimal
from PIL import Image

from django.conf import settings
from django.db import models
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.core.validators import RegexValidator
from django.core.files.storage import default_storage


def normalize_phone_number(phone, default_country_code='254'):
    if not phone:
        return phone
    digits = re.sub(r'\D', '', str(phone))
    if digits.startswith('0'):
        digits = default_country_code + digits[1:]
    elif not digits.startswith(default_country_code) and len(digits) == 9:
        digits = default_country_code + digits
    return f"+{digits}"


def get_profile_image_filepath(instance, filename):
    ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''
    if ext not in ('jpg', 'jpeg', 'png', 'webp', 'gif'):
        ext = 'jpg'
    filename = f"{uuid.uuid4()}.{ext}"
    return os.path.join('profile_pics/', filename)


def generate_unique_referral_code(model_class, length=8):
    while True:
        code = ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(length))
        if not model_class.objects.filter(referral_code=code).exists():
            return code


class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, help_text="What kind of leads are in this category?")

    class Meta:
        verbose_name_plural = "Categories"

    def __str__(self):
        return self.name


class UserManager(BaseUserManager):
    def create_user(self, phone_number, whatsapp_name='User', password=None, **extra_fields):
        if not phone_number:
            raise ValueError('The Phone Number must be set')

        phone_number = normalize_phone_number(phone_number)

        user = self.model(phone_number=phone_number, whatsapp_name=whatsapp_name, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, phone_number, whatsapp_name='Admin', password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)
        
        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')

        return self.create_user(phone_number, whatsapp_name, password, **extra_fields)


class User(AbstractUser):
    GENDER_CHOICES = (
        ('M', 'Male'),
        ('F', 'Female'),
        ('O', 'Other'),
    )

    AGE_CHOICES = (
        ('18-24', '18-24'),
        ('25-29', '25-29'),
        ('30-34', '30-34'),
        ('35-39', '35-39'),
        ('40-44', '40-44'),
        ('45-49', '45-49'),
        ('50-54', '50-54'),
        ('55+', '55+'),
    )

    username = None

    phone_regex = RegexValidator(
        regex=r'^\+?1?\d{9,15}$',
        message="Format: '+999999999'. Up to 15 digits allowed."
    )
    phone_number = models.CharField(validators=[phone_regex], max_length=17, unique=True)
    whatsapp_name = models.CharField(max_length=100)

    is_profile_complete = models.BooleanField(default=False, db_index=True)
    has_rewarded_referrer = models.BooleanField(default=False, db_index=True)
    is_temporarily_disabled = models.BooleanField(default=False, db_index=True)

    profile_pic = models.ImageField(upload_to=get_profile_image_filepath, null=True, blank=True)

    gender = models.CharField(max_length=1, choices=GENDER_CHOICES, null=True, blank=True, db_index=True)
    age_range = models.CharField(max_length=10, choices=AGE_CHOICES, null=True, blank=True)
    bio = models.TextField(max_length=500, blank=True, help_text="Business description for other users to see.")

    location_country = models.CharField(max_length=100, null=True, blank=True)
    location_state_county = models.CharField(max_length=100, null=True, blank=True, verbose_name="State/County", db_index=True)

    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True)

    referral_code = models.CharField(max_length=10, unique=True, blank=True)
    referred_by = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='referrals')
    
    # Financial and Stats tracking
    wallet_balance = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    total_downloads = models.IntegerField(default=0)
    terms_accepted_at = models.DateTimeField(null=True, blank=True)
    terms_version = models.CharField(max_length=32, blank=True)
    privacy_version = models.CharField(max_length=32, blank=True)

    is_always_injected = models.BooleanField(
        default=False,
        help_text="If True, this user is added to every VCF download automatically."
    )

    USERNAME_FIELD = 'phone_number'
    REQUIRED_FIELDS = ['whatsapp_name']

    objects = UserManager()

    class Meta:
        indexes = [
            models.Index(fields=['is_active', 'is_profile_complete', 'gender']),
            models.Index(fields=['is_active', 'is_profile_complete', 'location_state_county']),
        ]

    def __str__(self):
        return f"{self.whatsapp_name} ({self.phone_number})"
        
    def check_profile_complete(self):
        required_fields = [
            self.whatsapp_name,
            self.gender,
            self.age_range,
            self.bio,
            self.location_country,
            self.location_state_county,
            self.category_id, 
        ]
        
        for field in required_fields:
            if not field or not str(field).strip():
                return False
        return True

    def save(self, *args, **kwargs):
        update_fields = kwargs.get('update_fields')

        # Fast path: Skip heavy checks if updating non-profile fields (e.g. wallet_balance, total_downloads, has_rewarded_referrer)
        if update_fields is not None and not any(f in update_fields for f in ['profile_pic', 'phone_number', 'category', 'whatsapp_name', 'gender', 'bio']):
            super().save(*args, **kwargs)
            return

        # Ensure referral code exists
        if not self.referral_code:
            self.referral_code = generate_unique_referral_code(User)

        # Handle old profile picture cleanup
        profile_pic_changed = False
        if self.pk:
            try:
                old_user = User.objects.get(pk=self.pk)
                if old_user.profile_pic and old_user.profile_pic != self.profile_pic:
                    old_user.profile_pic.delete(save=False)
                    profile_pic_changed = True
            except User.DoesNotExist:
                pass
        else:
            if self.profile_pic:
                profile_pic_changed = True

        if self.phone_number:
            self.phone_number = normalize_phone_number(self.phone_number)

        # Assign default category if missing
        if not self.category_id:
            general_cat, _ = Category.objects.get_or_create(
                name='Save for Save',
                defaults={'description': 'Default category for general networking.'}
            )
            self.category = general_cat

        self.is_profile_complete = self.check_profile_complete()

        super().save(*args, **kwargs)

        # Process image thumbnail only when image is uploaded or modified
        if self.profile_pic and profile_pic_changed:
            try:
                with default_storage.open(self.profile_pic.name, 'rb') as f:
                    img = Image.open(f)
                    if img.height > 500 or img.width > 500:
                        output_size = (500, 500)
                        img.thumbnail(output_size)

                        with default_storage.open(self.profile_pic.name, 'wb') as img_file:
                            img.save(img_file, format=img.format or 'JPEG', quality=85, optimize=True)
            except Exception:
                pass

    def delete(self, *args, **kwargs):
        if self.is_superuser or self.is_staff:
            raise PermissionError("Superuser and administrator accounts cannot be deleted.")
            
        if self.profile_pic:
            self.profile_pic.delete(save=False)
            
        super().delete(*args, **kwargs)


class TokenTransaction(models.Model):
    TRANSACTION_TYPES = (
        ('WELCOME_BONUS', 'Welcome Bonus'),
        ('REFERRAL_REWARD', 'Referral Reward'),
        ('POOL_SPEND', 'Pool Entry Spend'),
        ('MPESA_PURCHASE', 'M-Pesa Cash Purchase'),
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='token_transactions'
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    transaction_type = models.CharField(max_length=20, choices=TRANSACTION_TYPES, db_index=True)
    description = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
        ]

    def __str__(self):
        return f"{self.user.phone_number} | {self.transaction_type} | {self.amount}"