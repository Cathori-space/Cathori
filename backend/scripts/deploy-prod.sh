#!/usr/bin/env bash
set -euo pipefail

if [[ ! "${CATHORI_BACKEND_IMAGE:-}" =~ ^ghcr\.io/cathori-space/cathori-backend@sha256:[0-9a-f]{64}$ ]]; then
  echo '승인된 백엔드 이미지 다이제스트가 필요합니다.' >&2
  exit 1
fi

compose=(docker compose -f docker-compose.prod.yml)

require_maintenance() {
  if [[ ! -f .release-state/enabled ]] || ! "${compose[@]}" exec -T nginx sh -ec '
    test -f /run/cathori-maintenance/enabled
    response=$(wget --no-check-certificate -S -O /dev/null https://127.0.0.1/api/public/notices 2>&1 || :)
    printf "%s\n" "$response" | grep -Eq "HTTP/1\\.[01] 503([[:space:]]|$)"
  '; then
    echo '배포 전에 Nginx 유지보수 응답(503)을 활성화해야 합니다.' >&2
    exit 1
  fi
}

require_stopped_backend() {
  local containers container state
  containers=$("${compose[@]}" ps --all --quiet backend)
  while IFS= read -r container; do
    [[ -n "$container" ]] || continue
    state=$(docker inspect --format '{{.State.Status}}' "$container")
    if [[ "$state" != exited && "$state" != created ]]; then
      echo '수동 마이그레이션 전에 구 백엔드의 요청과 발송을 종료해야 합니다.' >&2
      exit 1
    fi
  done <<< "$containers"
}

require_maintenance
require_stopped_backend
"${compose[@]}" pull backend
schema_version=$(docker image inspect --format '{{ index .Config.Labels "org.cathori.push-schema-version" }}' "$CATHORI_BACKEND_IMAGE")
if [[ "$schema_version" != 003 ]]; then
  echo '003 발송 자격 정책을 지원하는 백엔드 이미지가 필요합니다.' >&2
  exit 1
fi
ownership_policy=$(docker image inspect --format '{{ index .Config.Labels "org.cathori.push-ownership-policy" }}' "$CATHORI_BACKEND_IMAGE")
if [[ "$ownership_policy" != account-bound-v1 ]]; then
  echo '계정에 연결된 FCM 토큰의 재할당을 차단하는 이미지가 필요합니다.' >&2
  exit 1
fi
"${compose[@]}" run --rm --no-deps -T --entrypoint /app/production-entrypoint.sh backend verify-schema

require_maintenance
require_stopped_backend
"${compose[@]}" up -d --no-deps --wait --wait-timeout 180 backend
"${compose[@]}" up -d --build --no-deps nginx prometheus grafana
"${compose[@]}" exec -T nginx nginx -s reload
require_maintenance
