# Vercel's entry point for the FastAPI backend. vercel.json sends every /api/* request here,
# and the app's routes already carry the /api prefix.
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / 'backend'))

from app.db import Base, engine  # noqa: E402
from app.main import app  # noqa: E402, F401

# Serverless functions don't reliably run FastAPI's lifespan, so create the tables on cold start
Base.metadata.create_all(engine)
