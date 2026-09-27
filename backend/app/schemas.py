"""Request and response shapes. JSON uses camelCase to match the frontend."""

from datetime import date, datetime, timezone
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, StringConstraints, field_validator
from pydantic.alias_generators import to_camel

# Keep in step with frontend/src/lib/crops.js and services/prices.js
CROPS = ('maize', 'wheat', 'soybean', 'sunflower')
Crop = Literal['maize', 'wheat', 'soybean', 'sunflower']
Role = Literal['farmer', 'buyer', 'supplier']
RiskStatus = Literal['inspecting', 'done']


def iso(dt: datetime | None) -> str | None:
    """SQLite hands datetimes back without a timezone. They're always stored as UTC."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat().replace('+00:00', 'Z')


class Camel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


# ---------- auth ----------

class RegisterIn(Camel):
    full_name: Annotated[str, StringConstraints(strip_whitespace=True, min_length=2, max_length=120)]
    email: EmailStr
    phone: Annotated[str, StringConstraints(strip_whitespace=True, pattern=r'^\+?[\d\s-]{9,15}$')] | None = None
    role: Role = 'farmer'
    password: Annotated[str, StringConstraints(min_length=8, max_length=128)]

    @field_validator('phone', mode='before')
    @classmethod
    def blank_phone_is_none(cls, v):
        return v or None

    @field_validator('password')
    @classmethod
    def password_has_number(cls, v):
        if not any(ch.isdigit() for ch in v):
            raise ValueError('Add at least one number.')
        return v


class LoginIn(Camel):
    email: EmailStr
    password: str
    remember: bool = True


class UserOut(Camel):
    id: int
    email: str
    full_name: str
    phone: str | None
    role: str


class TokenOut(Camel):
    access_token: str
    token_type: str = 'bearer'
    expires_at: str
    user: UserOut


# ---------- farm ----------

class FarmIn(Camel):
    name: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)]
    region: Annotated[str, StringConstraints(strip_whitespace=True, max_length=120)] = ''


class SettingsIn(Camel):
    recovery_pct: float = Field(ge=0, le=100)


FieldName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=80)]


def _not_in_future(v: date | None) -> date | None:
    if v is not None and v > date.today():
        raise ValueError("Planting date can't be in the future.")
    return v


class FieldIn(Camel):
    name: FieldName
    crop: Crop
    hectares: float = Field(gt=0)
    lat: float = Field(ge=-90, le=90)
    lon: float = Field(ge=-180, le=180)
    planting_date: date
    expected_yield: float = Field(gt=0)
    # None means "follow the market price on the Crop prices screen"
    contract_price: float | None = Field(default=None, gt=0)
    irrigated: bool = False

    _check_date = field_validator('planting_date')(_not_in_future)


class FieldPatch(Camel):
    """Any subset of a field. contractPrice may be sent as null to clear it."""

    name: FieldName | None = None
    crop: Crop | None = None
    hectares: float | None = Field(default=None, gt=0)
    lat: float | None = Field(default=None, ge=-90, le=90)
    lon: float | None = Field(default=None, ge=-180, le=180)
    planting_date: date | None = None
    expected_yield: float | None = Field(default=None, gt=0)
    contract_price: float | None = Field(default=None, gt=0)
    irrigated: bool | None = None

    _check_date = field_validator('planting_date')(_not_in_future)


class FieldOut(Camel):
    id: str
    name: str
    crop: str
    hectares: float
    lat: float
    lon: float
    planting_date: str
    expected_yield: float
    contract_price: float | None
    irrigated: bool


class RiskStatusIn(Camel):
    status: RiskStatus


class CostLineEdit(BaseModel):
    # null while the farmer has the box empty; the frontend treats that as "no cost yet"
    rate: float | None = Field(default=None, ge=0)
    qty: float | None = Field(default=None, ge=0)
    enabled: bool | None = None


class CostOverrideIn(BaseModel):
    """Stored exactly as sent (unset keys left out), because the frontend tells
    "recoveryPct missing" (use the farm default) apart from "recoveryPct: null" (box being edited)."""

    model_config = ConfigDict(extra='forbid')

    lines: dict[Annotated[str, StringConstraints(max_length=40)], CostLineEdit] = Field(default_factory=dict, max_length=20)
    recoveryPct: float | None = Field(default=None, ge=0, le=100)


# ---------- prices ----------

class PriceIn(Camel):
    # null clears the price so the app asks for one
    price_per_ton: float | None = Field(default=None, ge=0)


# ---------- translation ----------

# South Africa's official spoken languages (ISO 639-1, or 639-3 where there's no two-letter code).
# Keep in step with LANGUAGES in frontend/src/state/LanguageContext.jsx
Language = Literal['en', 'af', 'nr', 'xh', 'zu', 'nso', 'st', 'tn', 'ss', 've', 'ts']


class TranslateIn(Camel):
    source: Language = 'en'
    target: Language
    # the limits are checked in the router, where they come from settings
    texts: list[str] = Field(min_length=1)


class TranslateOut(Camel):
    target: Language
    # one per input text, in order; None where no translation is available yet,
    # and the frontend shows the original instead
    translations: list[str | None]
