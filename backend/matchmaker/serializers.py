import html
import re
from decimal import Decimal
from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from accounts.models import Category, normalize_phone_number
from .models import QueueRequest, MatchBatch

# Dynamically resolve custom User model
User = get_user_model()


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name']


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
            'wallet_balance', 'is_profile_complete', 
            'first_name', 'last_name', 'email',
            'is_temporarily_disabled',
            'referral_count'
        ]
        read_only_fields = ['id', 'referral_code', 'wallet_balance', 'is_profile_complete']

    # --- XSS SANITIZATION VALIDATORS ---
    def validate_bio(self, value):
        return html.escape(value.strip()) if value else value

    def validate_whatsapp_name(self, value):
        return html.escape(value.strip()) if value else value

    def validate_first_name(self, value):
        return html.escape(value.strip()) if value else value

    def validate_last_name(self, value):
        return html.escape(value.strip()) if value else value

    def get_referral_count(self, obj):
        return User.objects.filter(referred_by=obj).count()


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8, style={'input_type': 'password'})
    referred_by_code = serializers.CharField(write_only=True, required=False, allow_blank=True, allow_null=True)

    class Meta:
        model = User
        fields = ['phone_number', 'whatsapp_name', 'password', 'referred_by_code']

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

    def create(self, validated_data):
        referred_by_code = validated_data.pop('referred_by_code', None)
        referrer_user = None

        if referred_by_code:
            try:
                referrer_user = User.objects.get(referral_code=referred_by_code)
            except User.DoesNotExist:
                pass

        user = User.objects.create_user(
            phone_number=validated_data['phone_number'],
            whatsapp_name=validated_data['whatsapp_name'],
            password=validated_data['password'],
            referred_by=referrer_user
        )

        return user

class QueueRequestSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='requested_category.name', read_only=True)

    class Meta:
        model = QueueRequest
        fields = ['id', 'status', 'requested_category', 'category_name', 'created_at']
        read_only_fields = ['status', 'created_at']


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        
        # --- REACTIVATION LOGIC ---
        if self.user.is_temporarily_disabled:
            self.user.is_temporarily_disabled = False
            self.user.save(update_fields=['is_temporarily_disabled'])
            
        return data