import html
import re
from django.conf import settings
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.utils import timezone
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import User, Category, normalize_phone_number
from .services import process_user_registration_rewards

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'description']


class UserSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    referral_count = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'phone_number', 'whatsapp_name', 'gender', 
            'age_range', 'location_country', 
            'location_state_county',
            'bio', 'profile_pic', 
            'category', 'category_name', 'referral_code', 
            'wallet_balance', 'total_downloads', 'is_profile_complete', 
            'has_rewarded_referrer',
            'first_name', 'last_name', 'email',
            'is_temporarily_disabled', 
            'referral_count' 
        ]
        read_only_fields = [
            'id', 'referral_code', 'wallet_balance', 
            'total_downloads', 'is_profile_complete', 
            'has_rewarded_referrer', 'is_temporarily_disabled'
        ]

    # XSS SANITIZATION VALIDATORS
    def validate_bio(self, value):
        return html.escape(value.strip()) if value else value

    def validate_whatsapp_name(self, value):
        return html.escape(value.strip()) if value else value

    def validate_first_name(self, value):
        return html.escape(value.strip()) if value else value

    def validate_last_name(self, value):
        return html.escape(value.strip()) if value else value

    def validate_profile_pic(self, value):
        if value is None:
            return value
        if value.size > 5 * 1024 * 1024:
            raise serializers.ValidationError('Profile images must be 5 MB or smaller.')
        image = getattr(value, 'image', None)
        if image and max(image.size) > 6000:
            raise serializers.ValidationError('Profile images must not exceed 6000 pixels in either dimension.')
        return value

    def get_referral_count(self, obj):
        return User.objects.filter(referred_by=obj).count()


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8, style={'input_type': 'password'})
    referred_by_code = serializers.CharField(write_only=True, required=False, allow_blank=True, allow_null=True)
    terms_accepted = serializers.BooleanField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ['phone_number', 'whatsapp_name', 'password', 'referred_by_code', 'terms_accepted']

    def validate_phone_number(self, value):
        normalized = normalize_phone_number(value)
        if not normalized or not re.fullmatch(r'^\+\d{9,15}$', normalized):
            raise serializers.ValidationError('Enter a valid phone number.')
        if User.objects.filter(phone_number=normalized).exists():
            raise serializers.ValidationError('A user with this phone number already exists.')
        return normalized

    def validate(self, attrs):
        candidate_user = User(
            phone_number=attrs['phone_number'],
            whatsapp_name=attrs['whatsapp_name'],
            first_name=attrs['whatsapp_name'],
        )
        candidate_user.username = attrs['phone_number']
        try:
            validate_password(attrs['password'], user=candidate_user)
        except ValidationError as exc:
            raise serializers.ValidationError({'password': list(exc.messages)})
        return attrs

    def validate_terms_accepted(self, value):
        if not value:
            raise serializers.ValidationError('You must accept the Terms and acknowledge the Privacy Policy.')
        return value

    def create(self, validated_data):
        referred_by_code = validated_data.pop('referred_by_code', None)
        validated_data.pop('terms_accepted')

        user = User.objects.create_user(
            phone_number=validated_data['phone_number'],
            whatsapp_name=validated_data['whatsapp_name'],
            password=validated_data['password']
        )
        user.terms_accepted_at = timezone.now()
        user.terms_version = settings.LEGAL_TERMS_VERSION
        user.privacy_version = settings.LEGAL_PRIVACY_VERSION
        user.save(update_fields=['terms_accepted_at', 'terms_version', 'privacy_version'])

        process_user_registration_rewards(user, referred_by_code)

        return user


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        
        # REACTIVATION LOGIC
        if self.user.is_temporarily_disabled:
            self.user.is_temporarily_disabled = False
            self.user.save(update_fields=['is_temporarily_disabled'])
            
        return data