from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, Category

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'description')
    search_fields = ('name',)
    ordering = ('name',)

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    # The fields to be used in displaying the User model.
    # These override the definitions on the base UserAdmin
    list_display = (
        'phone_number', 
        'whatsapp_name', 
        'category', 
        'wallet_balance', 
        'is_profile_complete', 
        'is_temporarily_disabled', 
        'is_always_injected',
        'is_staff'
    )
    
    list_filter = (
        'is_profile_complete', 
        'is_temporarily_disabled', 
        'is_always_injected', 
        'is_staff', 
        'is_superuser', 
        'category'
    )
    
    search_fields = ('phone_number', 'whatsapp_name', 'referral_code', 'email')
    ordering = ('-date_joined',)

    # Fieldsets control the layout of the "Edit User" page in the admin
    fieldsets = (
        ('Credentials', {'fields': ('phone_number', 'password')}),
        ('Personal Info', {'fields': (
            'whatsapp_name', 'first_name', 'last_name', 'email', 
            'gender', 'age_range', 'bio', 'profile_pic'
        )}),
        ('Location', {'fields': ('location_country', 'location_state_county')}),
        ('Platform Data', {'fields': (
            'category', 'wallet_balance', 'referral_code', 'referred_by', 'is_profile_complete'
        )}),
        ('Permissions & Status', {'fields': (
            'is_active', 'is_temporarily_disabled', 'is_always_injected', 
            'is_staff', 'is_superuser', 'groups', 'user_permissions'
        )}),
        ('Important Dates', {'fields': ('last_login', 'date_joined')}),
    )

    # add_fieldsets controls the "Add User" page in the admin
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('phone_number', 'whatsapp_name', 'password', 'is_staff', 'is_superuser'),
        }),
    )