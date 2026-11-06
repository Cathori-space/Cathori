#!/bin/sh
set -eu

java -Dspring.profiles.active=prod -cp /app/app.jar \
  -Dloader.main=org.cathori.backend.config.ProductionSchemaVerifier \
  org.springframework.boot.loader.launch.PropertiesLauncher

if [ "${1:-}" = "verify-schema" ]; then
  exit 0
fi

exec java -Dspring.profiles.active=prod -jar /app/app.jar
