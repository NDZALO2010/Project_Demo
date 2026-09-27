from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .db import Base, engine
from .routers import auth, farm, prices, weather


@asynccontextmanager
async def lifespan(_: FastAPI):
    # Fine for a prototype on SQLite. Move to Alembic migrations once the schema starts changing.
    Base.metadata.create_all(engine)
    yield


app = FastAPI(title='AgriNexus API', version='0.1.0', lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=['*'],
    allow_headers=['*'],
)

for module in (auth, farm, prices, weather):
    app.include_router(module.router, prefix='/api')


@app.get('/api/health', tags=['health'])
def health():
    return {'status': 'ok'}
