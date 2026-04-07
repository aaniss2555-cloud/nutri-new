from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone


class CustomUser(AbstractUser):
    username = None
    email = models.EmailField(unique=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    ROLE_CHOICES = (
        ("nutritionist", "Nutritionist"),
        ("client", "Client"),
    )

    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="client")
    phone = models.CharField(max_length=20, blank=True)
    age = models.IntegerField(null=True, blank=True)
    weight = models.FloatField(null=True, blank=True)
    allergies = models.TextField(blank=True)
    avoid = models.TextField(blank=True)

    def __str__(self):
        return self.email


class SubscriptionPlan(models.Model):
    TIER_CHOICES = (
        ("normal", "Normal"),
        ("premium", "Premium"),
    )

    code = models.CharField(max_length=20, choices=TIER_CHOICES, unique=True)
    name = models.CharField(max_length=120)
    description = models.TextField()
    duration_days = models.PositiveIntegerField(default=30)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    consultation_count = models.PositiveIntegerField(default=1)
    includes_followup = models.BooleanField(default=True)
    feature_access = models.JSONField(default=dict, blank=True)
    sort_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now, editable=False)

    class Meta:
        ordering = ["sort_order", "price", "name"]

    def __str__(self):
        return self.name


class UserSubscription(models.Model):
    STATUS_CHOICES = (
        ("pending", "Pending"),
        ("active", "Active"),
        ("expired", "Expired"),
        ("cancelled", "Cancelled"),
    )

    PAYMENT_STATUS_CHOICES = (
        ("unpaid", "Unpaid"),
        ("paid", "Paid"),
        ("refunded", "Refunded"),
    )

    user = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name="subscriptions",
    )
    subscription_plan = models.ForeignKey(
        SubscriptionPlan,
        on_delete=models.CASCADE,
        related_name="subscriptions",
    )
    nutritionist = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        related_name="managed_subscriptions",
        null=True,
        blank=True,
        limit_choices_to={"role": "nutritionist"},
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    payment_status = models.CharField(
        max_length=20,
        choices=PAYMENT_STATUS_CHOICES,
        default="unpaid",
    )
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    zoom_link = models.URLField(blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(default=timezone.now, editable=False)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user.email} - {self.subscription_plan.name}"


class Plan(models.Model):
    title = models.CharField(max_length=100)
    description = models.TextField()
    assigned_to = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name="plans",
        limit_choices_to={"role": "client"},
    )
    created_by = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        related_name="created_plans",
        null=True,
        blank=True,
        limit_choices_to={"role": "nutritionist"},
    )
    daily_calorie_target = models.PositiveIntegerField(null=True, blank=True)
    duration_weeks = models.PositiveIntegerField(null=True, blank=True)
    follow_up_notes = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now, editable=False)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["-created_at", "-id"]

    def __str__(self):
        return self.title
