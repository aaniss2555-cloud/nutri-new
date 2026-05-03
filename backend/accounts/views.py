from datetime import timedelta

import requests
from requests import RequestException

from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.db import models
from django.db.models import Sum
from django.core.mail import send_mail
from django.utils import timezone
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework import generics, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import BlogPost, Consultation, CustomUser, Inquiry, MealLog, Plan, PlanTemplate, SubscriptionPlan, UserSubscription
from .zoom_service import create_zoom_meeting
from .serializers import (
    AdminInquirySerializer,
    AdminUserSubscriptionSerializer,
    AdminUserSerializer,
    BlogPostSerializer,
    ClientSerializer,
    ConsultationSerializer,
    InquirySerializer,
    EmailTokenObtainPairSerializer,
    MealLogSerializer,
    PlanSerializer,
    PlanTemplateSerializer,
    ProfileSerializer,
    SubscriptionPlanSerializer,
    UserSerializer,
    UserSubscriptionSerializer,
)



def is_admin_user(user):
    return bool(user and user.is_authenticated and (user.is_staff or user.is_superuser))



def is_content_author(user):
    return bool(
        user
        and user.is_authenticated
        and (user.is_staff or user.is_superuser or user.role == "nutritionist")
    )


def can_edit_blog_post(user, post):
    if not is_content_author(user):
        return False
    if getattr(user, "role", None) == "nutritionist":
        return post.author == user or not post.author or is_admin_user(post.author)
    if is_admin_user(user):
        return not post.author or is_admin_user(post.author)
    return False


def can_delete_blog_post(user, post):
    if is_admin_user(user):
        return True
    return bool(user and user.is_authenticated and post.author == user)

def parse_boolean_flag(value):
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        normalized = value.strip().lower()
        if normalized in {"true", "1", "yes", "on"}:
            return True
        if normalized in {"false", "0", "no", "off"}:
            return False
    return None


def deactivate_account_side_effects(user):
    now = timezone.now()
    cancelled_subscriptions = 0

    if user.role == "client":
        cancelled_subscriptions = UserSubscription.objects.filter(
            user=user,
            status__in=["pending", "active"],
        ).update(status="cancelled", updated_at=now)

    cancelled_consultations = Consultation.objects.filter(
        models.Q(client=user) | models.Q(nutritionist=user),
        status="scheduled",
    ).update(status="cancelled", updated_at=now)

    return {
        "cancelled_subscriptions": cancelled_subscriptions,
        "cancelled_consultations": cancelled_consultations,
    }


class AdminSummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not is_admin_user(request.user):
            return Response(
                {"detail": "Only administrators can view this dashboard."},
                status=status.HTTP_403_FORBIDDEN,
            )

        users = CustomUser.objects.order_by("-date_joined")
        clients = users.filter(role="client")
        nutritionists = users.filter(role="nutritionist")
        subscriptions = UserSubscription.objects.select_related(
            "user",
            "subscription_plan",
            "nutritionist",
        ).order_by("-created_at")
        consultations = Consultation.objects.select_related(
            "client",
            "nutritionist",
        ).order_by("-scheduled_at")
        nutrition_plans = Plan.objects.select_related(
            "assigned_to",
            "created_by",
        ).order_by("-created_at")
        inquiries = Inquiry.objects.select_related("user").order_by("-created_at")
        blog_posts = BlogPost.objects.select_related("author").order_by("-published_at")

        recent_users = [
            {
                "id": user.id,
                "email": user.email,
                "full_name": f"{user.first_name} {user.last_name}".strip() or user.email,
                "role": "admin" if user.is_staff or user.is_superuser else user.role,
                "is_staff": user.is_staff,
                "date_joined": user.date_joined,
            }
            for user in users[:8]
        ]

        recent_subscriptions = [
            {
                "id": subscription.id,
                "client": subscription.user.email,
                "plan": subscription.subscription_plan.name,
                "status": subscription.status,
                "payment_status": subscription.payment_status,
                "start_date": subscription.start_date,
                "end_date": subscription.end_date,
            }
            for subscription in subscriptions[:8]
        ]

        return Response(
            {
                "stats": {
                    "total_users": users.count(),
                    "clients": clients.count(),
                    "nutritionists": nutritionists.count(),
                    "staff_admins": users.filter(is_staff=True).count(),
                    "active_subscriptions": subscriptions.filter(status="active").count(),
                    "subscription_plans": SubscriptionPlan.objects.count(),
                    "nutrition_plans": nutrition_plans.count(),
                    "scheduled_consultations": consultations.filter(status="scheduled").count(),
                    "completed_consultations": consultations.filter(status="completed").count(),
                    "open_inquiries": inquiries.filter(status="open").count(),
                    "published_posts": blog_posts.filter(is_published=True).count(),
                },
                "recent_users": recent_users,
                "subscription_plans": SubscriptionPlanSerializer(
                    SubscriptionPlan.objects.order_by("sort_order", "price", "name"),
                    many=True,
                ).data,
                "recent_subscriptions": recent_subscriptions,
                "recent_consultations": ConsultationSerializer(consultations[:8], many=True).data,
                "recent_nutrition_plans": PlanSerializer(nutrition_plans[:8], many=True).data,
                "recent_inquiries": AdminInquirySerializer(inquiries[:8], many=True).data,
                "recent_blog_posts": BlogPostSerializer(blog_posts[:8], many=True).data,
                "django_admin_url": "http://localhost:8000/admin/",
            }
        )



class InquiryCreateView(generics.CreateAPIView):
    serializer_class = InquirySerializer
    permission_classes = [AllowAny]

    def perform_create(self, serializer):
        user = self.request.user if self.request.user.is_authenticated else None
        serializer.save(user=user)


class AdminInquiryViewSet(viewsets.ModelViewSet):
    serializer_class = AdminInquirySerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "patch", "head", "options"]

    def get_queryset(self):
        if not is_admin_user(self.request.user):
            return Inquiry.objects.none()
        return Inquiry.objects.select_related("user").order_by("-created_at")

    def partial_update(self, request, *args, **kwargs):
        if not is_admin_user(request.user):
            return Response(
                {"detail": "Only administrators can manage inquiries."},
                status=status.HTTP_403_FORBIDDEN,
            )
        inquiry = self.get_object()
        inquiry.status = request.data.get("status", inquiry.status)
        inquiry.admin_note = request.data.get("admin_note", inquiry.admin_note)
        inquiry.updated_at = timezone.now()
        inquiry.save(update_fields=["status", "admin_note", "updated_at"])
        return Response(self.get_serializer(inquiry).data)

class AdminUserViewSet(viewsets.ModelViewSet):
    serializer_class = AdminUserSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "patch", "head", "options"]

    def get_queryset(self):
        if not is_admin_user(self.request.user):
            return CustomUser.objects.none()
        return CustomUser.objects.order_by("-date_joined")

    def partial_update(self, request, *args, **kwargs):
        if not is_admin_user(request.user):
            return Response(
                {"detail": "Only administrators can manage users."},
                status=status.HTTP_403_FORBIDDEN,
            )

        user = self.get_object()
        requested_active_state = parse_boolean_flag(request.data.get("is_active"))
        deactivate_requested = requested_active_state is False
        activate_requested = requested_active_state is True

        if deactivate_requested and user == request.user:
            return Response(
                {"detail": "You cannot deactivate your own admin account."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if deactivate_requested and user.is_superuser:
            return Response(
                {"detail": "Superuser accounts cannot be deactivated from this dashboard."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        was_active = user.is_active
        response = super().partial_update(request, *args, **kwargs)

        if was_active and deactivate_requested:
            summary = deactivate_account_side_effects(user)
            response.data["detail"] = "Account deactivated. Existing data was kept, active access was cancelled."
            response.data["deactivation_summary"] = summary
        elif not was_active and activate_requested:
            response.data["detail"] = "Account reactivated. Previous cancelled subscriptions or consultations were not restored automatically."

        return response



class AdminUserSubscriptionViewSet(viewsets.ModelViewSet):
    serializer_class = AdminUserSubscriptionSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "patch", "head", "options"]

    def get_queryset(self):
        if not is_admin_user(self.request.user):
            return UserSubscription.objects.none()
        return UserSubscription.objects.select_related("user", "subscription_plan", "nutritionist").order_by("-created_at")

    def partial_update(self, request, *args, **kwargs):
        if not is_admin_user(request.user):
            return Response(
                {"detail": "Only administrators can manage subscriptions."},
                status=status.HTTP_403_FORBIDDEN,
            )
        subscription = self.get_object()
        subscription.status = request.data.get("status", subscription.status)
        subscription.payment_status = request.data.get("payment_status", subscription.payment_status)
        subscription.notes = request.data.get("notes", subscription.notes)
        subscription.updated_at = timezone.now()
        subscription.save(update_fields=["status", "payment_status", "notes", "updated_at"])
        return Response(self.get_serializer(subscription).data)


class BlogPostViewSet(viewsets.ModelViewSet):
    serializer_class = BlogPostSerializer
    permission_classes = [AllowAny]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        queryset = BlogPost.objects.select_related("author").order_by("-published_at", "-id")
        if self.request.user.is_authenticated and is_admin_user(self.request.user):
            return queryset
        if self.request.user.is_authenticated and self.request.user.role == "nutritionist":
            return queryset.filter(
                models.Q(is_published=True)
                | models.Q(author=self.request.user)
                | models.Q(author__is_staff=True)
                | models.Q(author__is_superuser=True)
                | models.Q(author__isnull=True)
            )
        return queryset.filter(is_published=True)

    def create(self, request, *args, **kwargs):
        if not is_content_author(request.user):
            return Response(
                {"detail": "Only administrators and nutritionists can create blog posts."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        serializer.save(author=self.request.user, updated_at=timezone.now())

    def update(self, request, *args, **kwargs):
        post = self.get_object()
        if not can_edit_blog_post(request.user, post):
            return Response(
                {"detail": "You do not have permission to edit this blog post."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        post = self.get_object()
        if not can_edit_blog_post(request.user, post):
            return Response(
                {"detail": "You do not have permission to edit this blog post."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().partial_update(request, *args, **kwargs)

    def perform_update(self, serializer):
        serializer.save(updated_at=timezone.now())

    def destroy(self, request, *args, **kwargs):
        post = self.get_object()
        if not can_delete_blog_post(request.user, post):
            return Response(
                {"detail": "You do not have permission to delete this blog post."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().destroy(request, *args, **kwargs)

class AdminSubscriptionPlanViewSet(viewsets.ModelViewSet):
    serializer_class = SubscriptionPlanSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if not is_admin_user(self.request.user):
            return SubscriptionPlan.objects.none()
        return SubscriptionPlan.objects.order_by("sort_order", "price", "name")

    def create(self, request, *args, **kwargs):
        if not is_admin_user(request.user):
            return Response(
                {"detail": "Only administrators can create subscription plans."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        if not is_admin_user(request.user):
            return Response(
                {"detail": "Only administrators can update subscription plans."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        if not is_admin_user(request.user):
            return Response(
                {"detail": "Only administrators can update subscription plans."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        if not is_admin_user(request.user):
            return Response(
                {"detail": "Only administrators can delete subscription plans."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().destroy(request, *args, **kwargs)

class RegisterView(generics.CreateAPIView):
    queryset = CustomUser.objects.all()
    serializer_class = UserSerializer
    permission_classes = [AllowAny]


class EmailTokenObtainPairView(TokenObtainPairView):
    serializer_class = EmailTokenObtainPairSerializer


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = ProfileSerializer(request.user)
        return Response(serializer.data)

    def patch(self, request):
        serializer = ProfileSerializer(
            request.user,
            data=request.data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class ClientListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != "nutritionist":
            return Response(
                {"detail": "Only nutritionists can view clients."},
                status=status.HTTP_403_FORBIDDEN,
            )

        clients = CustomUser.objects.filter(role="client").order_by(
            "first_name",
            "last_name",
            "email",
        )
        serializer = ClientSerializer(clients, many=True)
        return Response(serializer.data)


class SubscriptionPlanView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        plans = SubscriptionPlan.objects.filter(is_active=True).order_by("sort_order", "price", "name")
        serializer = SubscriptionPlanSerializer(plans, many=True)
        return Response(serializer.data)


class MySubscriptionView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        subscription = request.user.subscriptions.filter(status="active").select_related(
            "subscription_plan",
            "nutritionist",
        ).first()
        if not subscription:
            return Response(None, status=status.HTTP_200_OK)
        return Response(UserSubscriptionSerializer(subscription).data)

    def post(self, request):
        if request.user.role != "client":
            return Response(
                {"detail": "Only client accounts can subscribe to access plans."},
                status=status.HTTP_403_FORBIDDEN,
            )

        plan_id = request.data.get("subscription_plan_id")
        if not plan_id:
            return Response(
                {"detail": "subscription_plan_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            plan = SubscriptionPlan.objects.get(pk=plan_id, is_active=True)
        except SubscriptionPlan.DoesNotExist:
            return Response(
                {"detail": "Selected subscription plan was not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        request.user.subscriptions.filter(status__in=["pending", "active"]).update(
            status="cancelled",
            updated_at=timezone.now(),
        )

        start_date = timezone.localdate()
        end_date = start_date + timedelta(days=plan.duration_days)

        subscription = UserSubscription.objects.create(
            user=request.user,
            subscription_plan=plan,
            status="active",
            payment_status="unpaid",
            start_date=start_date,
            end_date=end_date,
            updated_at=timezone.now(),
        )

        return Response(
            UserSubscriptionSerializer(subscription).data,
            status=status.HTTP_201_CREATED,
        )


class MealPredictView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if request.user.role != "client":
            return Response(
                {"detail": "Only client accounts can use AI meal prediction."},
                status=status.HTTP_403_FORBIDDEN,
            )

        uploaded_image = request.FILES.get("image")
        if not uploaded_image:
            return Response(
                {"detail": "An image file is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        content_type = uploaded_image.content_type or "application/octet-stream"
        ai_predict_url = getattr(
            settings,
            "AI_SERVICE_PREDICT_URL",
            "http://127.0.0.1:8001/predict",
        )

        try:
            uploaded_image.seek(0)
            ai_response = requests.post(
                ai_predict_url,
                files={
                    "image": (
                        uploaded_image.name,
                        uploaded_image,
                        content_type,
                    )
                },
                timeout=30,
            )
        except RequestException:
            return Response(
                {"detail": "AI service is unavailable. Make sure ai-service is running on port 8001."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        try:
            response_data = ai_response.json()
        except ValueError:
            response_data = {"detail": ai_response.text or "AI service returned an invalid response."}

        if ai_response.status_code >= 400:
            return Response(
                {"detail": "AI service rejected the image.", "ai_error": response_data},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        return Response(response_data, status=status.HTTP_200_OK)


class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email")
        user = CustomUser.objects.filter(email=email).first()

        if user:
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            reset_link = (
                f"{settings.FRONTEND_URL}/reset-password-confirm/{uid}/{token}"
            )

            send_mail(
                subject="Reset your password",
                message=f"Use this link to reset your password: {reset_link}",
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=False,
            )

        return Response(
            {"message": "If that email exists, a reset link has been sent."},
            status=status.HTTP_200_OK,
        )


class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        uid = request.data.get("uid")
        token = request.data.get("token")
        password = request.data.get("password")

        if not uid or not token or not password:
            return Response(
                {"detail": "uid, token, and password are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user_id = force_str(urlsafe_base64_decode(uid))
            user = CustomUser.objects.get(pk=user_id)
        except (TypeError, ValueError, OverflowError, CustomUser.DoesNotExist):
            return Response(
                {"detail": "Invalid reset link."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not default_token_generator.check_token(user, token):
            return Response(
                {"detail": "Invalid or expired reset token."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(password)
        user.save()

        return Response(
            {"message": "Password reset successful."},
            status=status.HTTP_200_OK,
        )


class MealLogViewSet(viewsets.ModelViewSet):
    serializer_class = MealLogSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = MealLog.objects.select_related("user").order_by("-meal_date", "-meal_time", "-id")
        if self.request.user.role == "client":
            return queryset.filter(user=self.request.user)
        if self.request.user.role == "nutritionist" or is_admin_user(self.request.user):
            client_id = self.request.query_params.get("client_id")
            if client_id:
                return queryset.filter(user_id=client_id, user__role="client")
            return queryset.filter(user__role="client")
        return queryset.none()

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def create(self, request, *args, **kwargs):
        if request.user.role != "client":
            return Response(
                {"detail": "Only clients can save meal logs."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().create(request, *args, **kwargs)


class ProgressSummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        client = request.user
        client_id = request.query_params.get("client_id")

        if request.user.role == "nutritionist" or is_admin_user(request.user):
            if not client_id:
                return Response(
                    {"detail": "client_id is required for nutritionist progress views."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            client = CustomUser.objects.filter(pk=client_id, role="client").first()
            if not client:
                return Response(
                    {"detail": "Client not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )
        elif request.user.role != "client":
            return Response(
                {"detail": "Only clients and nutritionists can view progress."},
                status=status.HTTP_403_FORBIDDEN,
            )

        today = timezone.localdate()
        latest_plan = client.plans.filter(is_active=True).order_by("-created_at", "-id").first()
        daily_goal = latest_plan.daily_calorie_target if latest_plan else None
        range_type = request.query_params.get("range", "7")

        if range_type == "plan" and latest_plan:
            start_date = latest_plan.created_at.date()
            days_count = (today - start_date).days + 1
        elif range_type == "all":
            first_log = MealLog.objects.filter(user=client).order_by("meal_date").first()
            start_date = first_log.meal_date if first_log else today
            days_count = (today - start_date).days + 1
        else:
            try:
                days_count = int(range_type)
            except (TypeError, ValueError):
                days_count = int(request.query_params.get("days", 7))
            days_count = min(max(days_count, 1), 180)
            start_date = today - timedelta(days=days_count - 1)

        days_count = min(max(days_count, 1), 180)

        totals = {
            item["meal_date"]: item["total"] or 0
            for item in MealLog.objects.filter(
                user=client,
                meal_date__gte=start_date,
                meal_date__lte=today,
            )
            .values("meal_date")
            .annotate(total=Sum("calories"))
        }

        days = []
        for offset in range(days_count):
            current_date = start_date + timedelta(days=offset)
            calories = int(totals.get(current_date, 0))
            status_label = "neutral"

            if daily_goal and calories > 0:
                ratio = calories / daily_goal
                if ratio < 0.8:
                    status_label = "under"
                elif ratio > 1.1:
                    status_label = "over"
                else:
                    status_label = "on-track"
            elif calories > 0:
                status_label = "logged"

            days.append(
                {
                    "date": current_date.isoformat(),
                    "label": current_date.strftime("%a"),
                    "calories": calories,
                    "goal": daily_goal,
                    "status": status_label,
                }
            )

        return Response(
            {
                "client_id": client.id,
                "client_name": f"{client.first_name} {client.last_name}".strip() or client.email,
                "daily_goal": daily_goal,
                "days": days,
            }
        )


class PlanTemplateViewSet(viewsets.ModelViewSet):
    serializer_class = PlanTemplateSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if self.request.user.role != "nutritionist" and not is_admin_user(self.request.user):
            return PlanTemplate.objects.none()
        if is_admin_user(self.request.user):
            return PlanTemplate.objects.select_related("created_by").all()
        return PlanTemplate.objects.select_related("created_by").filter(created_by=self.request.user)

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, updated_at=timezone.now())

    def create(self, request, *args, **kwargs):
        if request.user.role != "nutritionist" and not is_admin_user(request.user):
            return Response(
                {"detail": "Only nutritionists can create plan templates."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().create(request, *args, **kwargs)

    @action(detail=True, methods=["post"])
    def assign(self, request, pk=None):
        if request.user.role != "nutritionist" and not is_admin_user(request.user):
            return Response(
                {"detail": "Only nutritionists can assign plan templates."},
                status=status.HTTP_403_FORBIDDEN,
            )

        client_id = request.data.get("assigned_to") or request.data.get("client")
        client = CustomUser.objects.filter(pk=client_id, role="client").first()
        if not client:
            return Response(
                {"detail": "Select a valid client."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        template = self.get_object()
        plan = Plan.objects.create(
            title=template.title,
            description=template.description,
            assigned_to=client,
            created_by=request.user,
            source_template=template,
            daily_calorie_target=template.daily_calorie_target,
            duration_weeks=template.duration_weeks,
            follow_up_notes=template.follow_up_notes,
            updated_at=timezone.now(),
        )
        return Response(PlanSerializer(plan).data, status=status.HTTP_201_CREATED)

class PlanViewSet(viewsets.ModelViewSet):
    serializer_class = PlanSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Plan.objects.select_related("assigned_to", "created_by").all()
        if self.request.user.role == "client":
            return queryset.filter(assigned_to=self.request.user)
        return queryset

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def create(self, request, *args, **kwargs):
        if request.user.role != "nutritionist":
            return Response(
                {"detail": "Only nutritionists can create plans."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        if request.user.role != "nutritionist":
            return Response(
                {"detail": "Only nutritionists can update plans."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        if request.user.role != "nutritionist":
            return Response(
                {"detail": "Only nutritionists can update plans."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        if request.user.role != "nutritionist":
            return Response(
                {"detail": "Only nutritionists can delete plans."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().destroy(request, *args, **kwargs)

class ConsultationViewSet(viewsets.ModelViewSet):
    serializer_class = ConsultationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Consultation.objects.select_related("client", "nutritionist").all()
        if self.request.user.role == "client":
            return queryset.filter(client=self.request.user)
        if self.request.user.role == "nutritionist":
            return queryset.filter(nutritionist=self.request.user)
        if is_admin_user(self.request.user):
            return queryset
        return queryset.none()

    def create(self, request, *args, **kwargs):
        if request.user.role != "nutritionist":
            return Response(
                {"detail": "Only nutritionists can schedule Zoom consultations."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        consultation = serializer.save(nutritionist=request.user)

        try:
            zoom_meeting = create_zoom_meeting(consultation=consultation)
        except Exception:
            consultation.delete()
            raise

        consultation.zoom_meeting_id = str(zoom_meeting.get("id", ""))
        consultation.zoom_join_url = zoom_meeting.get("join_url", "")
        consultation.zoom_start_url = zoom_meeting.get("start_url", "")
        consultation.zoom_password = zoom_meeting.get("password", "")
        consultation.updated_at = timezone.now()
        consultation.save(update_fields=[
            "zoom_meeting_id",
            "zoom_join_url",
            "zoom_start_url",
            "zoom_password",
            "updated_at",
        ])

        return Response(
            self.get_serializer(consultation).data,
            status=status.HTTP_201_CREATED,
        )

    def update(self, request, *args, **kwargs):
        return Response(
            {"detail": "Consultations cannot be edited from this endpoint yet."},
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )

    def partial_update(self, request, *args, **kwargs):
        return Response(
            {"detail": "Consultations cannot be edited from this endpoint yet."},
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )

    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        if request.user.role != "nutritionist":
            return Response(
                {"detail": "Only nutritionists can complete consultations."},
                status=status.HTTP_403_FORBIDDEN,
            )

        consultation = self.get_object()
        consultation.status = "completed"
        consultation.updated_at = timezone.now()
        consultation.save(update_fields=["status", "updated_at"])
        return Response(self.get_serializer(consultation).data)

    def destroy(self, request, *args, **kwargs):
        if request.user.role != "nutritionist":
            return Response(
                {"detail": "Only nutritionists can cancel consultations."},
                status=status.HTTP_403_FORBIDDEN,
            )
        consultation = self.get_object()
        consultation.status = "cancelled"
        consultation.updated_at = timezone.now()
        consultation.save(update_fields=["status", "updated_at"])
        return Response(self.get_serializer(consultation).data)





















