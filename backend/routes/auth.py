"""
SAFE-FUSE AI — Auth Routes
Simple JWT-based authentication for the platform.
"""

import json
import os
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

# ─── Hard-coded demo users (for hackathon demo) ──────────────────────────────
DEMO_USERS = [
    {
        "id": "1",
        "email": "admin@safefuse.ai",
        "password": "SafeFuse2026",
        "name": "Rajesh Kumar",
        "role": "HSE Manager",
        "plant": "CIH Demo Plant",
    },
    {
        "id": "2",
        "email": "safety@safefuse.ai",
        "password": "Safety2026",
        "name": "Dr. Priya Sharma",
        "role": "Safety Officer",
        "plant": "CIH Demo Plant",
    },
    {
        "id": "3",
        "email": "manager@safefuse.ai",
        "password": "Manager2026",
        "name": "Vikram Nair",
        "role": "Plant Manager",
        "plant": "CIH Demo Plant",
    },
]


class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    success: bool
    user: dict
    token: str


@router.post("/login")
async def login(request: LoginRequest):
    """Authenticate user and return session token."""
    user = next(
        (u for u in DEMO_USERS
         if u["email"].lower() == request.email.lower() and u["password"] == request.password),
        None
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    # Simple token (in production, use JWT)
    token = f"sf-token-{user['id']}-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
    return {
        "success": True,
        "token": token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "role": user["role"],
            "plant": user["plant"],
        },
    }


@router.get("/users")
async def get_users():
    """Return demo user list (for Settings page)."""
    return [
        {"id": u["id"], "email": u["email"], "name": u["name"], "role": u["role"]}
        for u in DEMO_USERS
    ]
