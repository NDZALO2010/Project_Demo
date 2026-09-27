"""A sample farm near Bothaville, the same one as frontend/src/data/demoFarm.js.
Planting dates are relative to today so the demo always lands mid-season."""

from datetime import date, timedelta

DEMO_FARM = {'name': 'Mooiplaas Farming', 'region': 'Bothaville, Free State'}

# id, name, crop, hectares, lat, lon, days since planting, expected yield, irrigated
_FIELDS = [
    ('a3', 'A3', 'maize', 180, -27.372, 26.601, 74, 8, True),
    ('a7', 'A7', 'maize', 240, -27.388, 26.622, 81, 7.5, False),
    ('a12', 'A12', 'maize', 150, -27.401, 26.644, 70, 8, True),
    ('b2', 'B2', 'soybean', 210, -27.356, 26.667, 62, 3.2, False),
    ('b5', 'B5', 'soybean', 165, -27.341, 26.689, 58, 3, False),
    ('c1', 'C1', 'wheat', 120, -27.421, 26.612, 96, 6, True),
    ('c4', 'C4', 'sunflower', 260, -27.433, 26.587, 66, 2.2, False),
    ('c9', 'C9', 'maize', 195, -27.447, 26.631, 77, 7.8, False),
]


def demo_fields() -> list[dict]:
    today = date.today()
    return [
        {
            'id': fid,
            'name': name,
            'crop': crop,
            'hectares': ha,
            'lat': lat,
            'lon': lon,
            'planting_date': (today - timedelta(days=days)).isoformat(),
            'expected_yield': yld,
            'contract_price': None,
            'irrigated': irrigated,
        }
        for fid, name, crop, ha, lat, lon, days, yld, irrigated in _FIELDS
    ]
