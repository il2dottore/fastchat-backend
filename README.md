# FastChat Backend

Real-time chat backend built with NestJS, Socket.IO, MongoDB, Firebase Cloud Messaging, Cloudflare R2, and Coturn.

## Docker deployment

Requirements: Docker Engine and Docker Compose.

Clone the repository and create the runtime environment file:

`git clone https://github.com/il2dottore/fastchat-backend.git && cd fastchat-backend && cp .env.example .env`

Prepare `certs/key.pem`, `certs/cert.pem`, `firebase-service-account.json`, and `coturn/start-turn.sh`.

Pull the published images and start the stack:

`docker compose pull`

`docker compose up -d`

Check status and logs with `docker compose ps` and `docker compose logs -f api`.

Stop the stack with `docker compose down`.

MongoDB data is stored in the `mongo_data` volume. Do not use `docker compose down -v` if the data must be preserved.

## Environment configuration

The API runs on HTTPS port `443`:

`HOST=0.0.0.0`, `PORT=443`, `HTTPS_ENABLED=true`

The Docker MongoDB hostname is `mongdb-container`:

`MONGO_DB_HOST=mongdb-container`, `MONGO_DB_PORT=27017`

Configure `JWT_SECRET`, MongoDB credentials, Gmail SMTP, Cloudflare R2, and Coturn values in `.env`. Use `.env.example` as the template.

Coturn uses ports `3478`, `5349`, and relay range `49160-49200`.

## Specific image versions

Images are published when a Git tag is pushed:

`git tag v1.0.1 && git push origin v1.0.1`

Set `IMAGE_TAG=v1.0.1` in `.env`, then update the API with `docker compose pull api && docker compose up -d api`.

## Cloudflare Tunnel

Create a Cloudflare published application route from `api.example.com` to `https://localhost:443`.

If the origin certificate is self-signed, configure `noTLSVerify` for the origin request or use a trusted certificate.

Coturn requires UDP relay traffic and should use a public IP/domain directly. Open ports `3478` and `49160-49200` in the firewall/NAT configuration; do not use a regular HTTPS Tunnel route for TURN.

## GitHub Actions deployment

`.github/workflows/docker-publish.yml` builds and publishes `sussybakacute/fastchat-backend` to Docker Hub and can deploy to a VM through Cloudflare SSH Tunnel.

Required GitHub Actions secrets are `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`, `DEPLOY_SSH_KEY`, `DEPLOY_HOST`, `DEPLOY_USER`, and `DEPLOY_PATH`.

The VM must contain `docker-compose.yml`, `.env`, `certs/`, Firebase credentials, and `coturn/start-turn.sh`.

## Local development

Requirements: Node.js 22 and pnpm.

`corepack enable && pnpm install && cp .env.example .env && pnpm start:dev`

The root endpoint is `GET /`. See [docs/turn-server-setup.md](docs/turn-server-setup.md) for Coturn details.

## Security

Never commit `.env`, `firebase-service-account.json`, or `certs/key.pem`. Commit only `.env.example` with placeholder values.
