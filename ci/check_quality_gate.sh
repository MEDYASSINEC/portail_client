#!/usr/bin/env bash
set -euo pipefail

PROJECT_KEY="${1:-portail_client}"
HOST="${SONAR_HOST_URL}"
TOKEN="${SONAR_TOKEN}"

# Attendre que l'analyse soit traitée (polling)
for i in {1..30}; do
  echo "Checking SonarQube quality gate (attempt $i)..."
  STATUS_JSON=$(curl -s -u "${TOKEN}:" "${HOST}/api/qualitygates/project_status?projectKey=${PROJECT_KEY}")
  STATUS=$(echo "$STATUS_JSON" | jq -r '.projectStatus.status')
  if [ "$STATUS" != "INPROGRESS" ] && [ "$STATUS" != "PENDING" ]; then
    echo "Quality Gate status: $STATUS"
    if [ "$STATUS" = "OK" ]; then
      exit 0
    else
      echo "Quality Gate FAILED"
      echo "$STATUS_JSON"
      exit 1
    fi
  fi
  sleep 5
done

echo "Timed out waiting for Quality Gate"
exit 2
