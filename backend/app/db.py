from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from .config import settings

IS_SQLITE = settings.database_url.startswith('sqlite')

engine = create_engine(
    settings.database_url,
    # fail fast when PostgreSQL isn't up: Windows can otherwise wait over a minute on a dead port
    connect_args={'check_same_thread': False} if IS_SQLITE else {'connect_timeout': 5},
    # drop connections PostgreSQL closed while idle (e.g. after the container restarts)
    pool_pre_ping=not IS_SQLITE,
)

if IS_SQLITE:
    # SQLite still works for a quick run without Docker, but it ignores
    # ON DELETE CASCADE unless this is switched on per connection
    @event.listens_for(engine, 'connect')
    def _sqlite_foreign_keys(dbapi_conn, _):
        dbapi_conn.execute('PRAGMA foreign_keys=ON')


SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
