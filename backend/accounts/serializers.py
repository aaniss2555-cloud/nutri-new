from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import CustomUser, Plan, SubscriptionPlan, UserSubscription


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = [
            "id",
            "email",
            "password",
            "first_name",
            "last_name",
            "phone",
            "role",
            "age",
            "weight",
            "allergies",
            "avoid",
        ]
        extra_kwargs = {
            "password": {"write_only": True},
        }

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = CustomUser(**validated_data)
        user.set_password(password)
        user.save()
        return user


class SubscriptionPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubscriptionPlan
        fields = [
            "id",
            "name",
            "code",
            "description",
            "price",
            "duration_days",
            "consultation_count",
            "includes_followup",
            "feature_access",
            "is_active",
        ]


class UserSubscriptionSerializer(serializers.ModelSerializer):
    subscription_plan = SubscriptionPlanSerializer(read_only=True)
    nutritionist_name = serializers.SerializerMethodField()

    class Meta:
        model = UserSubscription
        fields = [
            "id",
            "status",
            "payment_status",
            "start_date",
            "end_date",
            "zoom_link",
            "notes",
            "subscription_plan",
            "nutritionist_name",
        ]

    def get_nutritionist_name(self, obj):
        if not obj.nutritionist:
            return None
        full_name = f"{obj.nutritionist.first_name} {obj.nutritionist.last_name}".strip()
        return full_name or obj.nutritionist.email


class PlanSerializer(serializers.ModelSerializer):
    assigned_to_email = serializers.EmailField(source="assigned_to.email", read_only=True)
    assigned_to_name = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Plan
        fields = [
            "id",
            "title",
            "description",
            "assigned_to",
            "assigned_to_email",
            "assigned_to_name",
            "created_by",
            "created_by_name",
            "daily_calorie_target",
            "duration_weeks",
            "follow_up_notes",
            "is_active",
            "created_at",
        ]
        read_only_fields = ["created_by", "created_at"]

    def get_assigned_to_name(self, obj):
        full_name = f"{obj.assigned_to.first_name} {obj.assigned_to.last_name}".strip()
        return full_name or obj.assigned_to.email

    def get_created_by_name(self, obj):
        if not obj.created_by:
            return None
        full_name = f"{obj.created_by.first_name} {obj.created_by.last_name}".strip()
        return full_name or obj.created_by.email


class ProfileSerializer(serializers.ModelSerializer):
    active_subscription = serializers.SerializerMethodField()
    latest_nutrition_plan = serializers.SerializerMethodField()

    class Meta:
        model = CustomUser
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "phone",
            "role",
            "age",
            "weight",
            "allergies",
            "avoid",
            "active_subscription",
            "latest_nutrition_plan",
        ]
        read_only_fields = ["id", "email", "role", "active_subscription", "latest_nutrition_plan"]

    def get_active_subscription(self, obj):
        subscription = obj.subscriptions.filter(status="active").select_related(
            "subscription_plan",
            "nutritionist",
        ).first()
        if not subscription:
            return None
        return UserSubscriptionSerializer(subscription).data

    def get_latest_nutrition_plan(self, obj):
        plan = obj.plans.select_related("created_by").first()
        if not plan:
            return None
        return PlanSerializer(plan).data


class ClientSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    active_subscription = serializers.SerializerMethodField()
    latest_nutrition_plan = serializers.SerializerMethodField()

    class Meta:
        model = CustomUser
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "full_name",
            "phone",
            "age",
            "weight",
            "allergies",
            "avoid",
            "active_subscription",
            "latest_nutrition_plan",
        ]

    def get_full_name(self, obj):
        full_name = f"{obj.first_name} {obj.last_name}".strip()
        return full_name or obj.email

    def get_active_subscription(self, obj):
        subscription = obj.subscriptions.filter(status="active").select_related(
            "subscription_plan",
            "nutritionist",
        ).first()
        if not subscription:
            return None
        return UserSubscriptionSerializer(subscription).data

    def get_latest_nutrition_plan(self, obj):
        plan = obj.plans.select_related("created_by").first()
        if not plan:
            return None
        return PlanSerializer(plan).data


class EmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    username_field = "email"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields.pop("username", None)
        self.fields["email"] = serializers.EmailField()
