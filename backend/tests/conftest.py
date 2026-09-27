import os

import pytest

# Point the app at the test database before it's imported. By default that's the agrinexus_test
# database in the Docker PostgreSQL; set AGRINEXUS_TEST_DATABASE_URL to use another, e.g.
#   AGRINEXUS_TEST_DATABASE_URL=sqlite:///./test.db
os.environ['AGRINEXUS_DATABASE_URL'] = os.environ.get(
    'AGRINEXUS_TEST_DATABASE_URL',
    'postgresql+psycopg://agrinexus:agrinexus@localhost:5433/agrinexus_test',
)
os.environ['AGRINEXUS_SECRET_KEY'] = 'test-secret-key-that-is-long-enough-for-hs256'

from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy.exc import OperationalError  # noqa: E402

from app.db import Base, engine  # noqa: E402
from app.main import app  # noqa: E402


@pytest.fixture(scope='session', autouse=True)
def database_is_up():
    try:
        with engine.connect():
            pass
    except OperationalError as err:
        # render_as_string() masks the password
        pytest.exit(
            f'Test database unreachable at {engine.url.render_as_string()}. '
            f'Start it with `npm run db:up`.\n{err.orig}',
            returncode=2,
        )


@pytest.fixture
def client():
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    with TestClient(app) as c:
        yield c


def register(client, email='thandi@farm.co.za', password='maize2026'):
    res = client.post(
        '/api/auth/register',
        json={'fullName': 'Thandi Nkosi', 'email': email, 'password': password, 'role': 'farmer'},
    )
    assert res.status_code == 201, res.text
    return res.json()


def login(client, email='thandi@farm.co.za', password='maize2026'):
    res = client.post('/api/auth/login', json={'email': email, 'password': password})
    assert res.status_code == 200, res.text
    return {'Authorization': f"Bearer {res.json()['accessToken']}"}


@pytest.fixture
def auth(client):
    register(client)
    return login(client)
