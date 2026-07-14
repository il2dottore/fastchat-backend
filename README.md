# FastChat Backend

SussyChat Backend is a real-time messaging server built with NestJS. It powers authentication, user profiles, conversations, messaging, reactions, media upload, push notifications, and WebRTC signaling for the companion Flutter app [`il2dottore/fastchat-mobile`](https://github.com/il2dottore/fastchat-mobile).

## Main Features

* User authentication with JWT-based sessions
* Registration flow and password reset verification by email
* Private and group conversations
* Real-time messaging with Socket.IO
* Message reactions
* Participant management, roles, kick, and ban flows
* User search and contact management
* Avatar, group thumbnail, and attachment upload
* Firebase Cloud Messaging push notifications
* WebRTC signaling for audio and video calls
* COTURN integration for TURN relay support

## Tech Stack

* NestJS 11
* TypeScript
* Socket.IO
* MongoDB
* TypeORM
* JWT
* Firebase Admin SDK
* Nodemailer
* AWS SDK for S3-compatible storage
* Docker and Docker Compose
* Coturn

## Project Structure

```text
src/
├── app.controller.ts            # Root health-style endpoint
├── app.module.ts                # Main Nest application module
├── main.ts                      # Bootstrap, HTTPS, cookies, WebSocket adapter
├── helpers/                     # Shared HTTP response helpers
├── pipes/                       # Validation pipe
├── shared/
│   ├── guards/                  # Authentication guards
│   └── services/                # Shared JWT, token, mail, and storage services
└── modules/
    ├── auth/                    # Login, logout, register, password reset
    ├── chat-logic/              # User blocking and moderation logic
    ├── contact/                 # Contact management
    ├── conversation/            # Conversation APIs
    ├── message/                 # Message APIs and Socket.IO gateways
    ├── notification/            # Firebase push notifications
    ├── participant/             # Participant roles, kick, ban, join, leave
    ├── reaction/                # Message reactions
    ├── search/                  # User, participant, and message search
    ├── upload/                  # Avatar, thumbnail, and attachment upload
    └── user/                    # User profile and user-specific APIs
```

Infrastructure and deployment files:

```text
certs/                           # HTTPS certificate and key
coturn/                          # TURN startup script
diagrams/                        # Sequence and activity diagrams
docker-compose.yml               # API, MongoDB, and COTURN stack
Dockerfile                       # Multi-stage production image
docs/                            # Extra deployment notes
src/.env.example                 # Environment variable template
```

## Requirements

Before running the project, prepare:

* Node.js 22 or a compatible modern Node.js version
* `pnpm` via Corepack, or npm if you prefer npm scripts
* MongoDB
* A TLS certificate and private key for HTTPS
* Optional Firebase service account for push notifications
* Optional SMTP credentials for email delivery
* Optional Cloudflare R2 or another S3-compatible object storage provider

Enable Corepack if you want to use `pnpm`:

```bash
corepack enable
```

## Installation

Clone the repository:

```bash
git clone https://github.com/il2dottore/bj_4_backend.git
cd bj_4_backend
```

Install dependencies:

```bash
pnpm install
```

You can also use npm:

```bash
npm install
```

## Environment Configuration

This project reads environment variables from `src/.env` by default.

Create your local env file from the example:

```bash
cp src/.env.example src/.env
```

### Core App Configuration

```env
JWT_SECRET=replace-with-a-strong-secret
HOST=0.0.0.0
PORT=3000
HTTPS_ENABLED=false
HTTPS_KEY_PATH=certs/key.pem
HTTPS_CERT_PATH=certs/cert.pem
```

### MongoDB

```env
MONGO_DB_HOST=localhost
MONGO_DB_PORT=27017
MONGO_DB_USERNAME=your-user
MONGO_DB_PASSWORD=your-password
MONGO_DB_DATABASE=sussychat
```

### Email

```env
MAIL_USER=your-email@example.com
MAIL_PASS=your-app-password
```

### S3-Compatible Storage

```env
R2_BUCKET=your-bucket
R2_PUBLIC_URL=https://cdn.example.com
R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
```

### TURN / Coturn

```env
TURN_REALM=sussychat.local
TURN_EXTERNAL_IP=192.168.1.240
TURN_USERNAME=sussybaka
TURN_PASSWORD=1234567890
TURN_TLS_ENABLED=false
```

## HTTPS Configuration

The app can run in HTTP or HTTPS mode depending on env configuration.

For local HTTP development:

```env
PORT=3000
HTTPS_ENABLED=false
```

For HTTPS:

```env
PORT=443
HTTPS_ENABLED=true
HTTPS_KEY_PATH=certs/key.pem
HTTPS_CERT_PATH=certs/cert.pem
```

Place your certificate files in:

```text
certs/key.pem
certs/cert.pem
```

## Firebase Configuration

Push notifications are optional, but if you want them enabled, place the Firebase service account file at the repository root:

```text
firebase-service-account.json
```

If that file is missing, the app still starts, but push notifications are disabled.

## Running the Project

Run in development mode:

```bash
pnpm start:dev
```

Run in debug mode:

```bash
pnpm start:debug
```

Build for production:

```bash
pnpm build
```

Run the compiled server:

```bash
pnpm start:prod
```

The root endpoint returns a simple JSON response:

```text
GET /
```

## Docker Deployment

This repository includes a production-oriented Docker setup with:

* `api` for the NestJS backend
* `mongo` for MongoDB
* `coturn` for TURN relay

Build and start the full stack:

```bash
docker compose up --build -d
```

Stop the stack:

```bash
docker compose down
```

By default, the Docker stack runs the API on HTTPS port `443`.

## WebSocket and WebRTC

The backend exposes Socket.IO events for:

* User registration on socket connect
* Conversation room join and leave
* Message create, update, and delete
* Reaction updates
* Call invitation and acceptance
* SDP offer and answer exchange
* ICE candidate exchange
* Call hang-up events

This is the signaling backend expected by the Flutter client in `il2dottore/bj_4_ui`.

For TURN setup details, see:

[docs/coturn-bj4-ui.md](docs/coturn-bj4-ui.md)

## Uploads and Media

The backend supports:

* `POST /upload/avatar`
* `POST /upload/group-thumbnail`
* `POST /upload/attachments`

Uploads are sent to the configured S3-compatible storage and the resulting public URLs are stored in MongoDB.

## Testing

Run Jest tests:

```bash
pnpm test
```

Watch test mode:

```bash
pnpm test:watch
```

Coverage:

```bash
pnpm test:cov
```

There are also manual HTTP request files inside module folders, such as:

```text
src/modules/auth/auth.tests.http
src/modules/message/message.tests.http
src/modules/search/search.tests.http
```

These are useful for quick endpoint testing in editors that support `.http` request files.

## Related Project

Flutter client:

* [`il2dottore/bj_4_ui`](https://github.com/il2dottore/bj_4_ui)
