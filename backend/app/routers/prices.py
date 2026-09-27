from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import PriceEntry, User, utcnow
from ..schemas import Crop, PriceIn, iso
from ..security import current_user

router = APIRouter(prefix='/prices', tags=['prices'])

# The frontend's manual price provider turns these entries into prices, filling any gaps
# with its starting estimates. A live JSE/SAFEX feed would slot in here later.


def entry_out(e: PriceEntry) -> dict:
    return {'pricePerTon': e.price_per_ton, 'updatedAt': iso(e.updated_at)}


@router.get('')
def get_price_entries(user: User = Depends(current_user), db: Session = Depends(get_db)):
    rows = db.scalars(select(PriceEntry).where(PriceEntry.user_id == user.id))
    return {e.crop: entry_out(e) for e in rows}


@router.put('/{crop}')
def set_price(crop: Crop, body: PriceIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    entry = db.get(PriceEntry, (user.id, crop)) or PriceEntry(user_id=user.id, crop=crop)
    # 0 would read as "worth nothing"; the app treats it as no price, so store it that way
    entry.price_per_ton = body.price_per_ton or None
    entry.updated_at = utcnow()
    db.add(entry)
    db.commit()
    return entry_out(entry)
