import secrets
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Path, status
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from ..db import get_db
from ..demo import DEMO_FARM, demo_fields
from ..models import DEFAULT_RECOVERY_PCT, CostOverride, Farm, Field, RiskAction, User, utcnow
from ..schemas import CostOverrideIn, FarmIn, FieldIn, FieldOut, FieldPatch, RiskStatusIn, SettingsIn, iso
from ..security import current_user

router = APIRouter(tags=['farm'])

# Risk keys are built by the frontend engine as "<fieldId>:<problem type>"
RiskKey = Path(pattern=r'^[\w-]{1,40}:[a-z]{1,30}$')


def field_out(f: Field) -> FieldOut:
    return FieldOut(
        id=f.id,
        name=f.name,
        crop=f.crop,
        hectares=f.hectares,
        lat=f.lat,
        lon=f.lon,
        planting_date=f.planting_date,
        expected_yield=f.expected_yield,
        contract_price=f.contract_price,
        irrigated=f.irrigated,
    )


def snapshot(db: Session, user: User) -> dict:
    """Everything FarmContext holds, in the shape it holds it."""
    farm = db.get(Farm, user.id)
    fields = db.scalars(select(Field).where(Field.user_id == user.id).order_by(Field.created_at, Field.id))
    actions = db.scalars(select(RiskAction).where(RiskAction.user_id == user.id))
    overrides = db.scalars(select(CostOverride).where(CostOverride.user_id == user.id))
    return {
        'farm': {'name': farm.name, 'region': farm.region} if farm and farm.name else None,
        'fields': [field_out(f).model_dump(by_alias=True) for f in fields],
        'actions': {a.key: {'status': a.status, 'at': iso(a.at)} for a in actions},
        'costOverrides': {o.key: o.data for o in overrides},
        'settings': {'recoveryPct': farm.recovery_pct if farm else DEFAULT_RECOVERY_PCT},
    }


def farm_row(db: Session, user: User) -> Farm:
    farm = db.get(Farm, user.id)
    if farm is None:
        farm = Farm(user_id=user.id, region='', recovery_pct=DEFAULT_RECOVERY_PCT)
        db.add(farm)
    return farm


def clear_farm(db: Session, user: User):
    for model in (Field, RiskAction, CostOverride, Farm):
        db.execute(delete(model).where(model.user_id == user.id))


def get_field(db: Session, user: User, field_id: str) -> Field:
    field = db.get(Field, (user.id, field_id))
    if field is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "That field doesn't exist anymore.")
    return field


# ---------- farm ----------

@router.get('/farm')
def get_farm(user: User = Depends(current_user), db: Session = Depends(get_db)):
    return snapshot(db, user)


@router.put('/farm')
def save_farm(body: FarmIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    farm = farm_row(db, user)
    farm.name, farm.region = body.name, body.region
    db.commit()
    return {'name': farm.name, 'region': farm.region}


@router.delete('/farm', status_code=status.HTTP_204_NO_CONTENT)
def reset_farm(user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Removes the farm, its fields and everything recorded against them. Crop prices stay."""
    clear_farm(db, user)
    db.commit()


@router.post('/farm/demo')
def load_demo(user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Replaces the farm with the sample one."""
    clear_farm(db, user)
    db.add(Farm(user_id=user.id, recovery_pct=DEFAULT_RECOVERY_PCT, **DEMO_FARM))
    # step the timestamps so the fields list in the demo's order
    now = utcnow()
    db.add_all(
        Field(user_id=user.id, created_at=now + timedelta(milliseconds=i), **f) for i, f in enumerate(demo_fields())
    )
    db.commit()
    return snapshot(db, user)


@router.patch('/farm/settings')
def update_settings(body: SettingsIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    farm = farm_row(db, user)
    farm.recovery_pct = body.recovery_pct
    db.commit()
    return {'recoveryPct': farm.recovery_pct}


# ---------- fields ----------

@router.get('/fields')
def list_fields(user: User = Depends(current_user), db: Session = Depends(get_db)) -> list[FieldOut]:
    rows = db.scalars(select(Field).where(Field.user_id == user.id).order_by(Field.created_at, Field.id))
    return [field_out(f) for f in rows]


@router.post('/fields', status_code=status.HTTP_201_CREATED)
def add_field(body: FieldIn, user: User = Depends(current_user), db: Session = Depends(get_db)) -> FieldOut:
    values = body.model_dump()
    values['planting_date'] = body.planting_date.isoformat()
    field = Field(user_id=user.id, id=secrets.token_hex(4), **values)
    db.add(field)
    db.commit()
    return field_out(field)


@router.patch('/fields/{field_id}')
def update_field(
    field_id: str, body: FieldPatch, user: User = Depends(current_user), db: Session = Depends(get_db)
) -> FieldOut:
    field = get_field(db, user, field_id)
    changes = body.model_dump(exclude_unset=True)
    for name, value in changes.items():
        # only contract_price may be cleared; a null anywhere else means "leave it alone"
        if value is None and name != 'contract_price':
            continue
        setattr(field, name, value.isoformat() if name == 'planting_date' else value)
    db.commit()
    return field_out(field)


@router.delete('/fields/{field_id}', status_code=status.HTTP_204_NO_CONTENT)
def remove_field(field_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    field = get_field(db, user, field_id)
    db.delete(field)
    # its monitoring history goes with it
    prefix = f'{field_id}:'
    for model in (RiskAction, CostOverride):
        db.execute(delete(model).where(model.user_id == user.id, model.key.startswith(prefix, autoescape=True)))
    db.commit()


# ---------- what the farmer is doing about each problem ----------

@router.put('/actions/{key}')
def set_risk_status(
    body: RiskStatusIn, key: str = RiskKey, user: User = Depends(current_user), db: Session = Depends(get_db)
):
    action = db.get(RiskAction, (user.id, key)) or RiskAction(user_id=user.id, key=key)
    action.status, action.at = body.status, utcnow()
    db.add(action)
    db.commit()
    return {'status': action.status, 'at': iso(action.at)}


@router.delete('/actions/{key}', status_code=status.HTTP_204_NO_CONTENT)
def reopen_risk(key: str = RiskKey, user: User = Depends(current_user), db: Session = Depends(get_db)):
    db.execute(delete(RiskAction).where(RiskAction.user_id == user.id, RiskAction.key == key))
    db.commit()


@router.put('/cost-overrides/{key}')
def save_cost_override(
    body: CostOverrideIn, key: str = RiskKey, user: User = Depends(current_user), db: Session = Depends(get_db)
):
    data = body.model_dump(exclude_unset=True)
    data['lines'] = {k: v.model_dump(exclude_unset=True) for k, v in body.lines.items()}
    override = db.get(CostOverride, (user.id, key)) or CostOverride(user_id=user.id, key=key)
    override.data = data
    db.add(override)
    db.commit()
    return data


@router.delete('/cost-overrides/{key}', status_code=status.HTTP_204_NO_CONTENT)
def reset_cost_override(key: str = RiskKey, user: User = Depends(current_user), db: Session = Depends(get_db)):
    db.execute(delete(CostOverride).where(CostOverride.user_id == user.id, CostOverride.key == key))
    db.commit()
