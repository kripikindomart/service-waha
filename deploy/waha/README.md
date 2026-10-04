# WAHA deployment

WAHA is the private WhatsApp engine layer. The application gateway should call
WAHA over `127.0.0.1:3000`; do not expose port 3000 publicly.

## Start on the VPS

```bash
cp .env.example .env
nano .env
docker compose pull
docker compose up -d
docker compose ps
docker compose logs -f waha
```

The API requires the `X-Api-Key` header configured in `.env`.

Session state is persisted in the `waha_sessions` Docker volume.

Pin and test a new WAHA tag before changing `WAHA_IMAGE`; do not use `latest`
for production.
