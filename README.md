# FastChat Backend

Backend chat real-time dùng NestJS, Socket.IO, MongoDB, Firebase, Cloudflare R2 và Coturn.

## Chạy bằng Docker

Yêu cầu: Docker Engine và Docker Compose Plugin.

```bash
git clone https://github.com/il2dottore/fastchat-backend.git
cd fastchat-backend
cp .env.example .env
docker compose pull
docker compose up -d
```

Kiểm tra container:

```bash
docker compose ps
docker compose logs -f api
```

Dừng hệ thống:

```bash
docker compose down
```

`.env` phải có MongoDB hostname là service/container trong Compose:

```env
IMAGE_TAG=latest
MONGO_DB_HOST=mongdb-container
MONGO_DB_PORT=27017
MONGO_DB_USERNAME=your-user
MONGO_DB_PASSWORD=your-password
MONGO_DB_DATABASE=sussychat
```

Chuẩn bị các file được mount:

```text
certs/key.pem
certs/cert.pem
firebase-service-account.json
coturn/start-turn.sh
```

MongoDB lưu dữ liệu trong volume `mongo_data`. Không dùng `docker compose down -v` nếu muốn giữ dữ liệu.

## Chạy image theo tag

Image được publish lên Docker Hub khi push Git tag:

```bash
git tag v1.0.1
git push origin v1.0.1
```

Chạy tag cụ thể bằng cách đặt trong `.env`:

```env
IMAGE_TAG=v1.0.1
```

Sau đó cập nhật:

```bash
docker compose pull api
docker compose up -d api
```

## HTTPS và dịch vụ

API chạy trên port `443`:

```env
HOST=0.0.0.0
PORT=443
HTTPS_ENABLED=true
HTTPS_KEY_PATH=certs/key.pem
HTTPS_CERT_PATH=certs/cert.pem
```

Coturn dùng port `3478`, TLS port `5349` và relay ports `49160-49200`. Cần mở các port này trên firewall/NAT nếu dùng WebRTC từ Internet.

Cloudflare Tunnel có thể route API tới `https://localhost:443`. Coturn cần public IP/domain và UDP relay trực tiếp, không dùng route HTTPS thông thường của Tunnel.

## GitHub Actions deploy

Workflow `.github/workflows/docker-publish.yml` build/push image lên Docker Hub và có thể deploy qua Cloudflare SSH Tunnel.

GitHub Secrets cần có:

```text
DOCKERHUB_USERNAME
DOCKERHUB_TOKEN
DEPLOY_SSH_KEY
DEPLOY_HOST
DEPLOY_USER
DEPLOY_PATH
```

VM cần có `docker-compose.yml`, `.env`, thư mục `certs/`, Firebase credentials và `coturn/start-turn.sh`.

## Chạy local không dùng Docker

```bash
corepack enable
pnpm install
cp .env.example .env
pnpm start:dev
```

Root endpoint: `GET /`.

Chi tiết Coturn xem tại [docs/turn-server-setup.md](docs/turn-server-setup.md).

## Bảo mật

Không commit `.env`, `firebase-service-account.json` hoặc `certs/key.pem`. Chỉ commit `.env.example` với giá trị mẫu.
