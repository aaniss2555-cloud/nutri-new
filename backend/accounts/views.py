from datetime import timedelta

import requests
from requests import RequestException

from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.utils import timezone
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework import generics, status, viewsets
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import CustomUser, Plan, SubscriptionPlan, UserSubscription
from .serializers import (
    ClientSerializer,
    EmailTokenObtainPairSerializer,
    PlanSerializer,
    ProfileSerializer,
    SubscriptionPlanSerializer,
    UserSerializer,
    UserSubscriptionSerializer,
)


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
