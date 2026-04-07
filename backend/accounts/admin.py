from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import CustomUser, Plan, SubscriptionPlan, UserSubscription


@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    model = CustomUser
    ordering = ("email",)
    list_display = ("email", "first_name", "last_name", "role", "is_staff")
    search_fields = ("email", "first_name", "last_name")
    list_filter = ("role", "is_staff", "is_superuser", "is_active")

    fieldsets = (
        (None, {"fields": ("email", "password")}),
        (
            "Personal Info",
            {
                "fields": (
                    "first_name",
                    "last_name",
                    "phone",
                    "age",
                    "weight",
                    "allergies",
                    "avoid",
                    "role",
                )
            },
        ),
        (
            "Permissions",
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                )
            },
        ),
        ("Important Dates", {"fields": ("last_login", "date_joined")}),
    )

    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": (
                    "email",
                    "password1",
                    "password2",
                    "role",
                    "is_staff",
                    "is_superuser",
                ),
            },
        ),
    )


@admin.register(SubscriptionPlan)
class SubscriptionPlanAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "code",
        "price",
        "duration_days",
        "consultation_count",
        "is_active",
    )
    list_filter = ("code", "is_active", "includes_followup")
    search_fields = ("name", "code", "description")
    ordering = ("sort_order", "price", "name")


@admin.register(UserSubscription)
class UserSubscriptionAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "subscription_plan",
        "status",
        "payment_status",
        "start_date",
        "end_date",
    )
    list_filter = ("status", "payment_status", "subscription_plan__code")
    search_fields = ("user__email", "subscription_plan__name", "nutritionist__email")


@admin.register(Plan)
class PlanAdmin(admin.ModelAdmin):
    list_display = ("title", "assigned_to", "created_by", "is_active", "created_at")
    list_filter = ("is_active",)
    search_fields = ("title", "assigned_to__email", "created_by__email")
