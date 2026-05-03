from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
from django.utils import timezone

def current_local_time():
    return timezone.localtime().time()


class CustomUserManager(BaseUserManager):
    use_in_migrations = True

    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("The email address must be set.")

        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)
        extra_fields.setdefault("role", "nutritionist")

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")

        return self.create_user(email, password, **extra_fields)

class CustomUser(AbstractUser):
    username = None
    email = models.EmailField(unique=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []
    objects = CustomUserManager()

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


class PlanTemplate(models.Model):
    title = models.CharField(max_length=100)
    description = models.TextField()
    created_by = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        related_name="plan_templates",
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
    source_template = models.ForeignKey(
        PlanTemplate,
        on_delete=models.SET_NULL,
        related_name="assigned_plans",
        null=True,
        blank=True,
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


class MealLog(models.Model):
    user = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name="meal_logs",
        limit_choices_to={"role": "client"},
    )
    meal_name = models.CharField(max_length=120, blank=True)
    calories = models.PositiveIntegerField(default=0)
    image_url = models.TextField(blank=True)
    ai_status = models.CharField(max_length=60, blank=True)
    meal_date = models.DateField(default=timezone.localdate)
    meal_time = models.TimeField(default=current_local_time)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(default=timezone.now, editable=False)

    class Meta:
        ordering = ["-meal_date", "-meal_time", "-id"]

    def __str__(self):
        return f"{self.user.email} - {self.meal_name or 'Meal'} - {self.calories} kcal"


class Consultation(models.Model):
    STATUS_CHOICES = (
        ("scheduled", "Scheduled"),
        ("completed", "Completed"),
        ("cancelled", "Cancelled"),
    )

    client = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name="client_consultations",
        limit_choices_to={"role": "client"},
    )
    nutritionist = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        related_name="nutritionist_consultations",
        null=True,
        blank=True,
        limit_choices_to={"role": "nutritionist"},
    )
    scheduled_at = models.DateTimeField()
    duration_minutes = models.PositiveIntegerField(default=30)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="scheduled")
    topic = models.CharField(max_length=160, blank=True)
    notes = models.TextField(blank=True)
    zoom_meeting_id = models.CharField(max_length=80, blank=True)
    zoom_join_url = models.URLField(blank=True)
    zoom_start_url = models.TextField(blank=True)
    zoom_password = models.CharField(max_length=80, blank=True)
    created_at = models.DateTimeField(default=timezone.now, editable=False)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["-scheduled_at", "-id"]

    def __str__(self):
        return f"{self.client.email} consultation on {self.scheduled_at:%Y-%m-%d %H:%M}"



class Inquiry(models.Model):
    STATUS_CHOICES = (
        ("open", "Open"),
        ("handled", "Handled"),
    )

    user = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        related_name="inquiries",
        null=True,
        blank=True,
    )
    full_name = models.CharField(max_length=120)
    email = models.EmailField()
    subject = models.CharField(max_length=160)
    message = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="open")
    admin_note = models.TextField(blank=True)
    created_at = models.DateTimeField(default=timezone.now, editable=False)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["-created_at", "-id"]

    def __str__(self):
        return f"{self.subject} - {self.email}"

class BlogPost(models.Model):
    CATEGORY_CHOICES = (
        ("nutrition", "Nutrition"),
        ("recipe", "Recipe"),
        ("lifestyle", "Lifestyle"),
        ("announcement", "Announcement"),
    )

    title = models.CharField(max_length=180)
    category = models.CharField(max_length=30, choices=CATEGORY_CHOICES, default="nutrition")
    summary = models.TextField(blank=True)
    image = models.FileField(upload_to="blog_images/", blank=True)
    content = models.TextField()
    author = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        related_name="blog_posts",
        null=True,
        blank=True,
        limit_choices_to={"is_staff": True},
    )
    is_published = models.BooleanField(default=True)
    published_at = models.DateTimeField(default=timezone.now)
    created_at = models.DateTimeField(default=timezone.now, editable=False)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["-published_at", "-id"]

    def __str__(self):
        return self.title



