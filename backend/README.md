# AgriNexus API

FastAPI + SQLAlchemy on PostgreSQL, which runs in Docker. It stores accounts, farms, fields, what the farmer is doing about each flagged problem, their cost edits, settings and crop prices, and proxies weather from Open-Meteo with a cache.

The risk engine, satellite simulation and money calculations stay in the frontend (`frontend/src/lib`, `frontend/src/services`), because they're pure functions of this data.

## Run it

From the project root:

```sh
npm run setup:api   # once: creates backend/.venv and installs requirements.txt
npm run db:up       # start PostgreSQL in Docker (needs Docker Desktop running)
npm run dev:api     # API on http://127.0.0.1:8000, docs at /docs
npm run dev         # frontend in a second terminal; Vite forwards /api to the API
npm run test:api    # pytest, against its own agrinexus_test database
```

## Database

`docker-compose.yml` at the project root runs `postgres:17-alpine` as `agrinexus-db`. It listens on **localhost:5433**, not 5432, so it doesn't clash with a PostgreSQL installed directly on the machine. The default login is user `agrinexus`, password `agrinexus`, database `agrinexus`, and the data lives in the `agrinexus-db` Docker volume.

- `npm run db:down` stops it and keeps the data. `docker compose down -v` also deletes the data.
- `npm run db:shell` opens `psql`.
- Tables are created when the API starts.
- The tests drop and recreate tables in a separate `agrinexus_test` database, created by `docker/init-test-db.sql` the first time the volume is made. Set `AGRINEXUS_TEST_DATABASE_URL=sqlite:///./test.db` to run them without Docker.

Settings are listed in `.env.example`. Set `AGRINEXUS_SECRET_KEY` anywhere real people log in, and change the database password anywhere that isn't your own machine.

## Endpoints

All under `/api`. Everything except register, login and health needs `Authorization: Bearer <token>`. JSON is camelCase.

| Method | Path | What it does |
| --- | --- | --- |
| POST | `/auth/register` | Create an account (`fullName`, `email`, `phone?`, `role`, `password`) |
| POST | `/auth/login` | Get a token (`email`, `password`, `remember`) |
| GET | `/auth/me` | The signed-in user |
| GET | `/farm` | Everything the app holds: `farm`, `fields`, `actions`, `costOverrides`, `settings` |
| PUT | `/farm` | Save farm name and region |
| DELETE | `/farm` | Reset the farm and everything recorded against it (prices stay) |
| POST | `/farm/demo` | Replace the farm with the sample Bothaville farm |
| PATCH | `/farm/settings` | `recoveryPct` (0–100) |
| GET / POST | `/fields` | List or add fields |
| PATCH / DELETE | `/fields/{id}` | Change or delete a field (deleting drops its actions and cost edits) |
| PUT / DELETE | `/actions/{fieldId:type}` | Mark a problem `inspecting` / `done`, or reopen it |
| PUT / DELETE | `/cost-overrides/{fieldId:type}` | Save or reset the cost edits for a problem |
| GET | `/prices` | The prices the farmer has entered |
| PUT | `/prices/{crop}` | Set a price per tonne, or `null` to clear it |
| GET | `/weather?lat=&lon=` | Open-Meteo: 14 days back, 7 ahead, cached per ~10 km for 30 min |
| GET | `/health` | Liveness check |

The schema is created with `create_all` on startup. Switch to Alembic migrations before the schema needs to change under real data.
