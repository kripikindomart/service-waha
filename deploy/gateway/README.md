# Gateway deployment

The gateway joins the private `service-waha-net` Docker network and calls WAHA
at `http://servic-waha:3000`. WAHA must be started first.

```bash
cp .env.example .env
nano .env
docker compose up -d --build
```

Test from the VPS host:

```bash
curl http://127.0.0.1:8080/health
curl http://127.0.0.1:8080/v1/sessions \
  -H "X-Api-Key: <GATEWAY_API_KEY>"
```
