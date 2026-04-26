from __future__ import annotations

import base64
from datetime import timezone as datetime_timezone

import requests
from django.conf import settings
from django.utils import timezone
from requests import RequestException
from rest_framework import serializers

TOKEN_URL = "https://zoom.us/oauth/token"
MEETINGS_URL = "https://api.zoom.us/v2/users/{user_id}/meetings"


def _require_zoom_setting(name: str) -> str:
    value = getattr(settings, name, "")
    if not value:
        raise serializers.ValidationError(
            {"zoom": f"{name} is not configured in Django settings."}
        )
    return value


def get_zoom_access_token() -> str:
    account_id = _require_zoom_setting("ZOOM_ACCOUNT_ID")
    client_id = _require_zoom_setting("ZOOM_CLIENT_ID")
    client_secret = _require_zoom_setting("ZOOM_CLIENT_SECRET")

    basic_token = base64.b64encode(f"{client_id}:{client_secret}".encode()).decode()

    try:
        response = requests.post(
            TOKEN_URL,
            params={"grant_type": "account_credentials", "account_id": account_id},
            headers={"Authorization": f"Basic {basic_token}"},
            timeout=20,
        )
    except RequestException as exc:
        raise serializers.ValidationError(
            {"zoom": "Could not reach Zoom while requesting an access token."}
        ) from exc

    if response.status_code >= 400:
        raise serializers.ValidationError(
            {"zoom": response.json() if response.content else "Zoom token request failed."}
        )

    return response.json()["access_token"]


def create_zoom_meeting(*, consultation) -> dict:
    access_token = get_zoom_access_token()
    user_id = getattr(settings, "ZOOM_USER_ID", "me") or "me"
    topic = consultation.topic or f"Nutrition consultation with {consultation.client.email}"

    payload = {
        "topic": topic,
        "type": 2,
        "start_time": consultation.scheduled_at.astimezone(datetime_timezone.utc).strftime(
            "%Y-%m-%dT%H:%M:%SZ"
        ),
        "duration": consultation.duration_minutes,
        "timezone": "UTC",
        "agenda": consultation.notes[:2000],
        "settings": {
            "join_before_host": False,
            "waiting_room": True,
            "approval_type": 0,
        },
    }

    try:
        response = requests.post(
            MEETINGS_URL.format(user_id=user_id),
            json=payload,
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=20,
        )
    except RequestException as exc:
        raise serializers.ValidationError(
            {"zoom": "Could not reach Zoom while creating the meeting."}
        ) from exc

    if response.status_code >= 400:
        raise serializers.ValidationError(
            {"zoom": response.json() if response.content else "Zoom meeting creation failed."}
        )

    return response.json()

