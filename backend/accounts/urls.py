from django.urls import path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    AdminInquiryViewSet,
    AdminSubscriptionPlanViewSet,
    AdminSummaryView,
    AdminUserSubscriptionViewSet,
    AdminUserViewSet,
    BlogPostViewSet,
    ClientListView,
    ConsultationViewSet,
    EmailTokenObtainPairView,
    InquiryCreateView,
    MeView,
    MealPredictView,
    MealLogViewSet,
    MySubscriptionView,
    PasswordResetConfirmView,
    PasswordResetRequestView,
    PlanViewSet,
    PlanTemplateViewSet,
    ProgressSummaryView,
    RegisterView,
    SubscriptionPlanView,
)

router = DefaultRouter()
router.register(r"plans", PlanViewSet, basename="plan")
router.register(r"plan-templates", PlanTemplateViewSet, basename="plan-template")
router.register(r"meal-logs", MealLogViewSet, basename="meal-log")
router.register(r"consultations", ConsultationViewSet, basename="consultation")
router.register(r"admin-users", AdminUserViewSet, basename="admin-user")
router.register(r"admin-subscription-plans", AdminSubscriptionPlanViewSet, basename="admin-subscription-plan")
router.register(r"admin-inquiries", AdminInquiryViewSet, basename="admin-inquiry")
router.register(r"admin-subscriptions", AdminUserSubscriptionViewSet, basename="admin-subscription")
router.register(r"blog-posts", BlogPostViewSet, basename="blog-post")

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", EmailTokenObtainPairView.as_view(), name="login"),
    path("login/refresh/", TokenRefreshView.as_view(), name="refresh"),
    path("me/", MeView.as_view(), name="me"),
    path("meal-predict/", MealPredictView.as_view(), name="meal-predict"),
    path("progress/", ProgressSummaryView.as_view(), name="progress-summary"),
    path("clients/", ClientListView.as_view(), name="clients"),
    path("admin-summary/", AdminSummaryView.as_view(), name="admin-summary"),
    path("inquiries/", InquiryCreateView.as_view(), name="inquiry-create"),
    path("subscription-plans/", SubscriptionPlanView.as_view(), name="subscription-plans"),
    path("my-subscription/", MySubscriptionView.as_view(), name="my-subscription"),
    path("password-reset/", PasswordResetRequestView.as_view(), name="password-reset"),
    path(
        "password-reset-confirm/",
        PasswordResetConfirmView.as_view(),
        name="password-reset-confirm",
    ),
] + router.urls


