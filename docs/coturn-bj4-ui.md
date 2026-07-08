# COTURN for `il2dottore/bj_4_ui`

This backend repo now includes a `coturn` service in [docker-compose.yml](../docker-compose.yml).

## Required backend env

Add these values to `src/.env` on the backend server:

```env
TURN_REALM=sussychat.local
TURN_EXTERNAL_IP=192.168.1.240
TURN_USERNAME=sussybaka
TURN_PASSWORD=1234567890
TURN_TLS_ENABLED=false
```

Notes:

- `TURN_EXTERNAL_IP` must be the IP or public domain-reachable address of the Ubuntu server running Docker.
- Keep `TURN_TLS_ENABLED=false` when using a self-signed certificate for TURN. Many WebRTC clients reject self-signed `turns:` certificates.
- If you later move to a real CA-signed certificate, you can set `TURN_TLS_ENABLED=true` and use `turns:` on port `5349`.

## Run

```bash
docker compose up --build -d
```

TURN ports exposed by Compose:

- `3478/tcp`
- `3478/udp`
- `5349/tcp`
- `5349/udp`
- `49160-49200/tcp`
- `49160-49200/udp`

If `ufw` or a cloud firewall is enabled, open those ports.

## Flutter changes in `bj_4_ui`

Update `lib/services/socket_service.dart` to point at this backend:

```dart
socket = io.io(
  'https://192.168.1.240',
  io.OptionBuilder()
      .setTransports(['websocket'])
      .enableReconnection()
      .setReconnectionAttempts(10)
      .setReconnectionDelay(2000)
      .disableAutoConnect()
      .build(),
);
```

Update `lib/services/signaling_service.dart`:

```dart
final Map<String, dynamic> _configuration = {
  'iceServers': [
    {
      'urls': [
        'stun:stun.l.google.com:19302',
        'stun:stun1.l.google.com:19302',
      ],
    },
    {
      'urls': 'turn:192.168.1.240:3478?transport=udp',
      'username': 'sussybaka',
      'credential': '1234567890',
    },
    {
      'urls': 'turn:192.168.1.240:3478?transport=tcp',
      'username': 'sussybaka',
      'credential': '1234567890',
    },
  ],
  'iceCandidatePoolSize': 0,
};
```

Replace `192.168.1.240`, username, and password with your real TURN values.

## Verification

After `docker compose up -d`, check:

```bash
docker compose logs --tail=50 coturn
docker compose ps
```

From another machine on the same network, the UI should use:

- signaling API/socket: `https://192.168.1.240`
- TURN: `turn:192.168.1.240:3478`
