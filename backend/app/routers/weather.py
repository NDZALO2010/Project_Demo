import time

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, status

from ..config import settings
from ..models import User
from ..security import current_user

router = APIRouter(prefix='/weather', tags=['weather'])

# Open-Meteo: free, no API key, and it includes FAO evapotranspiration.
# The frontend parses the response (services/weather.js); this just fetches and caches it.
OPEN_METEO = 'https://api.open-meteo.com/v1/forecast'

DAILY = ','.join([
    'temperature_2m_max',
    'temperature_2m_min',
    'precipitation_sum',
    'et0_fao_evapotranspiration',
    'relative_humidity_2m_mean',
    'wind_speed_10m_max',
])

_cache: dict[str, tuple[float, dict]] = {}


async def fetch_open_meteo(lat: float, lon: float) -> dict:
    params = {
        'latitude': lat,
        'longitude': lon,
        'current': 'temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation',
        'daily': DAILY,
        'past_days': 14,
        'forecast_days': 7,
        'timezone': 'auto',
    }
    async with httpx.AsyncClient(timeout=10) as client:
        res = await client.get(OPEN_METEO, params=params)
        res.raise_for_status()
        return res.json()


@router.get('')
async def get_weather(
    lat: float = Query(ge=-90, le=90),
    lon: float = Query(ge=-180, le=180),
    _: User = Depends(current_user),
):
    # fields a few km apart share a weather cell, so cache per ~10 km square
    lat, lon = round(lat, 1), round(lon, 1)
    key = f'{lat},{lon}'

    hit = _cache.get(key)
    if hit and time.monotonic() - hit[0] < settings.weather_cache_minutes * 60:
        return hit[1]

    try:
        data = await fetch_open_meteo(lat, lon)
    except httpx.HTTPError as err:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, f'Weather service unavailable: {err}')

    _cache[key] = (time.monotonic(), data)
    return data
