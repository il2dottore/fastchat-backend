#!/bin/sh
set -eu

container_ip="${TURN_CONTAINER_IP:-$(hostname -i | awk '{print $1}')}"
relay_ip="${TURN_RELAY_IP:-$container_ip}"

set -- \
  turnserver \
  -n \
  --log-file=stdout \
  --simple-log \
  --no-cli \
  --no-multicast-peers \
  --no-rfc5780 \
  --fingerprint \
  --lt-cred-mech \
  --user="${TURN_USERNAME:?TURN_USERNAME is required}:${TURN_PASSWORD:?TURN_PASSWORD is required}" \
  --realm="${TURN_REALM:?TURN_REALM is required}" \
  --listening-ip="${TURN_LISTEN_IP:-0.0.0.0}" \
  --relay-ip="${relay_ip}" \
  --listening-port="${TURN_PORT:-3478}" \
  --min-port="${TURN_MIN_PORT:-49160}" \
  --max-port="${TURN_MAX_PORT:-49200}"

if [ -n "${TURN_EXTERNAL_IP:-}" ]; then
  if [ "${TURN_EXTERNAL_IP}" = "${container_ip}" ]; then
    set -- "$@" --external-ip="${TURN_EXTERNAL_IP}"
  else
    set -- "$@" --external-ip="${TURN_EXTERNAL_IP}/${container_ip}"
  fi
fi

if [ "${TURN_TLS_ENABLED:-false}" = "true" ]; then
  set -- "$@" \
    --tls-listening-port="${TURN_TLS_PORT:-5349}" \
    --cert="${TURN_CERT_PATH:-/certs/cert.pem}" \
    --pkey="${TURN_PKEY_PATH:-/certs/key.pem}"
else
  set -- "$@" --no-tls --no-dtls
fi

exec "$@"
