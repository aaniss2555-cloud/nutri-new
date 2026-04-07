from django.db import migrations, models


def seed_subscription_tiers(apps, schema_editor):
    SubscriptionPlan = apps.get_model("accounts", "SubscriptionPlan")

    defaults = [
        {
            "code": "normal",
            "name": "Normal",
            "description": "Basic subscription for access to the platform and an initial nutrition consultation.",
            "duration_days": 30,
            "price": "0.00",
            "consultation_count": 1,
            "includes_followup": False,
            "feature_access": {
                "ai_calorie_tracking": True,
                "nutritionist_chat": False,
                "zoom_consultation": True,
                "followup_support": False,
                "priority_support": False,
            },
            "sort_order": 1,
            "is_active": True,
        },
        {
            "code": "premium",
            "name": "Premium",
            "description": "Extended subscription with follow-up support, richer nutrition guidance, and premium access.",
            "duration_days": 60,
            "price": "0.00",
            "consultation_count": 4,
            "includes_followup": True,
            "feature_access": {
                "ai_calorie_tracking": True,
                "nutritionist_chat": True,
                "zoom_consultation": True,
                "followup_support": True,
                "priority_support": True,
            },
            "sort_order": 2,
            "is_active": True,
        },
    ]

    for tier in defaults:
        SubscriptionPlan.objects.update_or_create(
            code=tier["code"],
            defaults=tier,
        )


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0006_subscriptionplan_alter_plan_options_plan_created_at_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="subscriptionplan",
            name="code",
            field=models.CharField(
                choices=[("normal", "Normal"), ("premium", "Premium")],
                default="normal",
                max_length=20,
                unique=True,
            ),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="subscriptionplan",
            name="feature_access",
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AddField(
            model_name="subscriptionplan",
            name="sort_order",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AlterModelOptions(
            name="subscriptionplan",
            options={"ordering": ["sort_order", "price", "name"]},
        ),
        migrations.RunPython(seed_subscription_tiers, migrations.RunPython.noop),
    ]
