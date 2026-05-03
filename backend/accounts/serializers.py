from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import BlogPost, Consultation, CustomUser, Inquiry, MealLog, Plan, PlanTemplate, SubscriptionPlan, UserSubscription


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
            "source_template",
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


class PlanTemplateSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = PlanTemplate
        fields = [
            "id",
            "title",
            "description",
            "created_by",
            "created_by_name",
            "daily_calorie_target",
            "duration_weeks",
            "follow_up_notes",
            "is_active",
            "created_at",
        ]
        read_only_fields = ["created_by", "created_by_name", "created_at"]

    def get_created_by_name(self, obj):
        if not obj.created_by:
            return None
        full_name = f"{obj.created_by.first_name} {obj.created_by.last_name}".strip()
        return full_name or obj.created_by.email


class MealLogSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = MealLog
        fields = [
            "id",
            "user",
            "user_email",
            "meal_name",
            "calories",
            "image_url",
            "ai_status",
            "meal_date",
            "meal_time",
            "notes",
            "created_at",
        ]
        read_only_fields = ["user", "user_email", "created_at"]

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
            "is_staff",
            "is_superuser",
            "age",
            "weight",
            "allergies",
            "avoid",
            "active_subscription",
            "latest_nutrition_plan",
        ]
        read_only_fields = ["id", "email", "role", "is_staff", "is_superuser", "active_subscription", "latest_nutrition_plan"]

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

class ConsultationSerializer(serializers.ModelSerializer):
    client_email = serializers.EmailField(source="client.email", read_only=True)
    client_name = serializers.SerializerMethodField()
    nutritionist_email = serializers.EmailField(source="nutritionist.email", read_only=True)
    nutritionist_name = serializers.SerializerMethodField()

    class Meta:
        model = Consultation
        fields = [
            "id",
            "client",
            "client_email",
            "client_name",
            "nutritionist",
            "nutritionist_email",
            "nutritionist_name",
            "scheduled_at",
            "duration_minutes",
            "status",
            "topic",
            "notes",
            "zoom_meeting_id",
            "zoom_join_url",
            "zoom_start_url",
            "zoom_password",
            "created_at",
        ]
        read_only_fields = [
            "nutritionist",
            "status",
            "zoom_meeting_id",
            "zoom_join_url",
            "zoom_start_url",
            "zoom_password",
            "created_at",
        ]

    def validate_client(self, value):
        if value.role != "client":
            raise serializers.ValidationError("Consultations can only be assigned to client accounts.")
        return value

    def validate_duration_minutes(self, value):
        if value not in [30, 45, 60]:
            raise serializers.ValidationError("Duration must be 30, 45, or 60 minutes.")
        return value

    def get_client_name(self, obj):
        full_name = f"{obj.client.first_name} {obj.client.last_name}".strip()
        return full_name or obj.client.email

    def get_nutritionist_name(self, obj):
        if not obj.nutritionist:
            return None
        full_name = f"{obj.nutritionist.first_name} {obj.nutritionist.last_name}".strip()
        return full_name or obj.nutritionist.email





class AdminUserSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = CustomUser
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "full_name",
            "role",
            "is_active",
            "is_staff",
            "is_superuser",
            "date_joined",
        ]
        read_only_fields = ["id", "email", "is_superuser", "date_joined"]

    def get_full_name(self, obj):
        full_name = f"{obj.first_name} {obj.last_name}".strip()
        return full_name or obj.email

    def validate_role(self, value):
        if value not in ["client", "nutritionist"]:
            raise serializers.ValidationError("Role must be client or nutritionist.")
        return value

class InquirySerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = Inquiry
        fields = [
            "id",
            "user",
            "user_email",
            "full_name",
            "email",
            "subject",
            "message",
            "status",
            "admin_note",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["user", "user_email", "status", "admin_note", "created_at", "updated_at"]


class AdminInquirySerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = Inquiry
        fields = [
            "id",
            "user",
            "user_email",
            "full_name",
            "email",
            "subject",
            "message",
            "status",
            "admin_note",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "user", "user_email", "full_name", "email", "subject", "message", "created_at", "updated_at"]

class AdminUserSubscriptionSerializer(serializers.ModelSerializer):
    client_email = serializers.EmailField(source="user.email", read_only=True)
    client_name = serializers.SerializerMethodField()
    subscription_plan_name = serializers.CharField(source="subscription_plan.name", read_only=True)

    class Meta:
        model = UserSubscription
        fields = [
            "id",
            "user",
            "client_email",
            "client_name",
            "subscription_plan",
            "subscription_plan_name",
            "status",
            "payment_status",
            "start_date",
            "end_date",
            "notes",
            "created_at",
        ]
        read_only_fields = ["id", "user", "client_email", "client_name", "subscription_plan", "subscription_plan_name", "start_date", "end_date", "created_at"]

    def get_client_name(self, obj):
        full_name = f"{obj.user.first_name} {obj.user.last_name}".strip()
        return full_name or obj.user.email


class BlogPostSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()
    author_role = serializers.SerializerMethodField()
    author_is_admin = serializers.SerializerMethodField()
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = BlogPost
        fields = [
            "id",
            "title",
            "category",
            "summary",
            "image",
            "image_url",
            "content",
            "author",
            "author_name",
            "author_role",
            "author_is_admin",
            "is_published",
            "published_at",
            "created_at",
        ]
        read_only_fields = ["author", "author_name", "author_role", "author_is_admin", "image_url", "created_at"]

    def get_image_url(self, obj):
        if not obj.image:
            return None
        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(obj.image.url)
        return obj.image.url

    def get_author_name(self, obj):
        if not obj.author:
            return "Administrator"
        full_name = f"{obj.author.first_name} {obj.author.last_name}".strip()
        return full_name or obj.author.email

    def get_author_role(self, obj):
        if not obj.author:
            return "admin"
        if obj.author.is_staff or obj.author.is_superuser:
            return "admin"
        return obj.author.role

    def get_author_is_admin(self, obj):
        return bool(not obj.author or obj.author.is_staff or obj.author.is_superuser)








