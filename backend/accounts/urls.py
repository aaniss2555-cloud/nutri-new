from django.urls import path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    ClientListView,
    EmailTokenObtainPairView,
    MeView,
    MySubscriptionView,
    PasswordResetConfirmView,
    PasswordResetRequestView,
    PlanViewSet,
    RegisterView,
    SubscriptionPlanView,
)

router = DefaultRouter()
router.register(r"plans", PlanViewSet, basename="plan")

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", EmailTokenObtainPairView.as_view(), name="login"),
    path("login/refresh/", TokenRefreshView.as_view(), name="refresh"),
    path("me/", MeView.as_view(), name="me"),
    path("clients/", ClientListView.as_view(), name="clients"),
    path("subscription-plans/", SubscriptionPlanView.as_view(), name="subscription-plans"),
    path("my-subscription/", MySubscriptionView.as_view(), name="my-subscription"),
    path("password-reset/", PasswordResetRequestView.as_view(), name="password-reset"),
    path(
        "password-reset-confirm/",
        PasswordResetConfirmView.as_view(),
        name="password-reset-confirm",
    ),
] + router.urls
