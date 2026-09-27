from datetime import datetime, timezone

from sqlalchemy import JSON, Boolean, DateTime, Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from .db import Base

DEFAULT_RECOVERY_PCT = 80  # keep in step with frontend/src/lib/finance.js


def utcnow():
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = 'users'

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(254), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(120))
    phone: Mapped[str | None] = mapped_column(String(20))
    role: Mapped[str] = mapped_column(String(20))
    password_hash: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Farm(Base):
    """One per user. The row exists as soon as a setting is saved; name is set during onboarding."""

    __tablename__ = 'farms'

    user_id: Mapped[int] = mapped_column(ForeignKey('users.id', ondelete='CASCADE'), primary_key=True)
    name: Mapped[str | None] = mapped_column(String(120))
    region: Mapped[str] = mapped_column(String(120), default='')
    recovery_pct: Mapped[float] = mapped_column(Float, default=DEFAULT_RECOVERY_PCT)


class Field(Base):
    # Field ids are short strings the frontend puts in URLs and risk keys ("<fieldId>:<type>"),
    # so they only need to be unique per user.
    __tablename__ = 'fields'

    user_id: Mapped[int] = mapped_column(ForeignKey('users.id', ondelete='CASCADE'), primary_key=True)
    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    name: Mapped[str] = mapped_column(String(80))
    crop: Mapped[str] = mapped_column(String(40))
    hectares: Mapped[float] = mapped_column(Float)
    lat: Mapped[float] = mapped_column(Float)
    lon: Mapped[float] = mapped_column(Float)
    planting_date: Mapped[str] = mapped_column(String(10))  # YYYY-MM-DD, as the frontend sends it
    expected_yield: Mapped[float] = mapped_column(Float)
    contract_price: Mapped[float | None] = mapped_column(Float)
    irrigated: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class RiskAction(Base):
    """What the farmer is doing about a flagged problem: 'inspecting' or 'done'."""

    __tablename__ = 'risk_actions'

    user_id: Mapped[int] = mapped_column(ForeignKey('users.id', ondelete='CASCADE'), primary_key=True)
    key: Mapped[str] = mapped_column(String(80), primary_key=True)
    status: Mapped[str] = mapped_column(String(20))
    at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class CostOverride(Base):
    """The farmer's edits to one problem's cost lines, stored as the frontend shapes them:
    { "lines": { "fertiliser": { "rate": 900, "enabled": false } }, "recoveryPct": 60 }"""

    __tablename__ = 'cost_overrides'

    user_id: Mapped[int] = mapped_column(ForeignKey('users.id', ondelete='CASCADE'), primary_key=True)
    key: Mapped[str] = mapped_column(String(80), primary_key=True)
    data: Mapped[dict] = mapped_column(JSON)


class PriceEntry(Base):
    """A crop price the farmer typed. price_per_ton of None means they cleared it on purpose."""

    __tablename__ = 'price_entries'

    user_id: Mapped[int] = mapped_column(ForeignKey('users.id', ondelete='CASCADE'), primary_key=True)
    crop: Mapped[str] = mapped_column(String(40), primary_key=True)
    price_per_ton: Mapped[float | None] = mapped_column(Float)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
