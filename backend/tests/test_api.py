from datetime import date, timedelta

from conftest import login, register

FIELD = {
    'name': 'A3',
    'crop': 'maize',
    'hectares': 180,
    'lat': -27.372,
    'lon': 26.601,
    'plantingDate': (date.today() - timedelta(days=74)).isoformat(),
    'expectedYield': 8,
    'contractPrice': None,
    'irrigated': True,
}


# ---------- auth ----------

def test_register_login_and_me(client):
    user = register(client, email='Thandi@Farm.co.za')
    assert user['email'] == 'thandi@farm.co.za'
    assert 'password' not in str(user).lower()

    headers = login(client, email='THANDI@farm.co.za')
    me = client.get('/api/auth/me', headers=headers).json()
    assert me['fullName'] == 'Thandi Nkosi'


def test_duplicate_email_is_rejected(client):
    register(client)
    res = client.post(
        '/api/auth/register',
        json={'fullName': 'Someone', 'email': 'thandi@farm.co.za', 'password': 'another123'},
    )
    assert res.status_code == 409


def test_password_rules_match_the_form(client):
    res = client.post('/api/auth/register', json={'fullName': 'T N', 'email': 'a@b.co', 'password': 'nonumbers'})
    assert res.status_code == 422


def test_wrong_password_and_missing_token(client):
    register(client)
    assert client.post('/api/auth/login', json={'email': 'thandi@farm.co.za', 'password': 'wrong123'}).status_code == 401
    assert client.post('/api/auth/login', json={'email': 'nobody@farm.co.za', 'password': 'wrong123'}).status_code == 401
    assert client.get('/api/farm').status_code == 401
    assert client.get('/api/farm', headers={'Authorization': 'Bearer junk'}).status_code == 401


# ---------- farm ----------

def test_new_user_starts_empty(client, auth):
    assert client.get('/api/farm', headers=auth).json() == {
        'farm': None,
        'fields': [],
        'actions': {},
        'costOverrides': {},
        'settings': {'recoveryPct': 80},
    }


def test_onboarding_flow(client, auth):
    client.put('/api/farm', headers=auth, json={'name': ' Mooiplaas ', 'region': 'Free State'})
    created = client.post('/api/fields', headers=auth, json=FIELD).json()
    assert created['id'] and created['plantingDate'] == FIELD['plantingDate']

    state = client.get('/api/farm', headers=auth).json()
    assert state['farm'] == {'name': 'Mooiplaas', 'region': 'Free State'}
    assert [f['name'] for f in state['fields']] == ['A3']


def test_field_validation(client, auth):
    future = (date.today() + timedelta(days=3)).isoformat()
    for bad in ({'hectares': 0}, {'lat': 95}, {'crop': 'sorghum'}, {'plantingDate': future}, {'contractPrice': 0}):
        assert client.post('/api/fields', headers=auth, json={**FIELD, **bad}).status_code == 422, bad


def test_update_field_can_set_and_clear_contract_price(client, auth):
    fid = client.post('/api/fields', headers=auth, json=FIELD).json()['id']

    res = client.patch(f'/api/fields/{fid}', headers=auth, json={'contractPrice': 4300, 'name': 'A3 north'})
    assert res.json()['contractPrice'] == 4300 and res.json()['name'] == 'A3 north'

    res = client.patch(f'/api/fields/{fid}', headers=auth, json={'contractPrice': None})
    assert res.json()['contractPrice'] is None
    assert res.json()['hectares'] == 180


def test_deleting_a_field_drops_its_history(client, auth):
    fid = client.post('/api/fields', headers=auth, json=FIELD).json()['id']
    other = client.post('/api/fields', headers=auth, json={**FIELD, 'name': 'A7'}).json()['id']
    client.put(f'/api/actions/{fid}:nutrient', headers=auth, json={'status': 'inspecting'})
    client.put(f'/api/cost-overrides/{fid}:nutrient', headers=auth, json={'lines': {'scouting': {'rate': 1000}}})
    client.put(f'/api/actions/{other}:water', headers=auth, json={'status': 'done'})

    assert client.delete(f'/api/fields/{fid}', headers=auth).status_code == 204
    state = client.get('/api/farm', headers=auth).json()
    assert list(state['actions']) == [f'{other}:water']
    assert state['costOverrides'] == {}
    assert client.delete(f'/api/fields/{fid}', headers=auth).status_code == 404


def test_risk_status_and_cost_overrides(client, auth):
    res = client.put('/api/actions/a3:nutrient', headers=auth, json={'status': 'inspecting'})
    assert res.json()['status'] == 'inspecting' and res.json()['at'].endswith('Z')
    assert client.put('/api/actions/a3:nutrient', headers=auth, json={'status': 'bogus'}).status_code == 422
    assert client.put('/api/actions/not-a-key', headers=auth, json={'status': 'done'}).status_code == 422

    # recoveryPct: null is kept (box being edited); leaving it out means "use the farm default"
    body = {'lines': {'fertiliser': {'enabled': False}, 'scouting': {'rate': None}}, 'recoveryPct': None}
    client.put('/api/cost-overrides/a3:nutrient', headers=auth, json=body)
    client.put('/api/cost-overrides/a3:water', headers=auth, json={'lines': {'labour': {'qty': 4}}})
    state = client.get('/api/farm', headers=auth).json()
    assert state['costOverrides'] == {
        'a3:nutrient': body,
        'a3:water': {'lines': {'labour': {'qty': 4}}},
    }

    client.delete('/api/actions/a3:nutrient', headers=auth)
    client.delete('/api/cost-overrides/a3:nutrient', headers=auth)
    state = client.get('/api/farm', headers=auth).json()
    assert state['actions'] == {} and list(state['costOverrides']) == ['a3:water']


def test_settings(client, auth):
    assert client.patch('/api/farm/settings', headers=auth, json={'recoveryPct': 120}).status_code == 422
    client.patch('/api/farm/settings', headers=auth, json={'recoveryPct': 65})
    state = client.get('/api/farm', headers=auth).json()
    assert state['settings'] == {'recoveryPct': 65}
    # a saved setting alone doesn't count as a farm, so onboarding still runs
    assert state['farm'] is None


def test_demo_and_reset(client, auth):
    client.put('/api/prices/maize', headers=auth, json={'pricePerTon': 4200})
    state = client.post('/api/farm/demo', headers=auth).json()
    assert state['farm']['name'] == 'Mooiplaas Farming'
    assert [f['id'] for f in state['fields']] == ['a3', 'a7', 'a12', 'b2', 'b5', 'c1', 'c4', 'c9']

    # loading it twice replaces rather than duplicates
    assert len(client.post('/api/farm/demo', headers=auth).json()['fields']) == 8

    assert client.delete('/api/farm', headers=auth).status_code == 204
    assert client.get('/api/farm', headers=auth).json()['fields'] == []
    # prices are market data and survive a farm reset
    assert client.get('/api/prices', headers=auth).json()['maize']['pricePerTon'] == 4200


def test_users_cannot_see_each_other(client, auth):
    client.post('/api/farm/demo', headers=auth)
    register(client, email='other@farm.co.za')
    other = login(client, email='other@farm.co.za')

    assert client.get('/api/farm', headers=other).json()['fields'] == []
    assert client.patch('/api/fields/a3', headers=other, json={'name': 'mine'}).status_code == 404
    # both can have a demo farm with the same field ids
    assert len(client.post('/api/farm/demo', headers=other).json()['fields']) == 8


# ---------- prices ----------

def test_prices(client, auth):
    assert client.get('/api/prices', headers=auth).json() == {}

    res = client.put('/api/prices/wheat', headers=auth, json={'pricePerTon': 6100}).json()
    assert res['pricePerTon'] == 6100 and res['updatedAt'].endswith('Z')

    client.put('/api/prices/soybean', headers=auth, json={'pricePerTon': None})
    entries = client.get('/api/prices', headers=auth).json()
    assert entries['soybean']['pricePerTon'] is None
    assert set(entries) == {'wheat', 'soybean'}

    assert client.put('/api/prices/sorghum', headers=auth, json={'pricePerTon': 3000}).status_code == 422


# ---------- weather ----------

def test_weather_is_proxied_and_cached(client, auth, monkeypatch):
    from app.routers import weather

    calls = []

    async def fake_fetch(lat, lon):
        calls.append((lat, lon))
        return {'daily': {'time': []}, 'current': {}}

    weather._cache.clear()
    monkeypatch.setattr(weather, 'fetch_open_meteo', fake_fetch)

    assert client.get('/api/weather?lat=-27.372&lon=26.601', headers=auth).status_code == 200
    # a field a couple of km away lands in the same cell
    assert client.get('/api/weather?lat=-27.388&lon=26.622', headers=auth).status_code == 200
    assert calls == [(-27.4, 26.6)]

    assert client.get('/api/weather?lat=-27.4&lon=26.6').status_code == 401
