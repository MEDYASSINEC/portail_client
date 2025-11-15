#!/usr/bin/env bash
set -euo pipefail

# Variables (adaptation possible)
PROJECT_KEY="${1:-portail_client}"
PROJECT_NAME="${2:-portail_client}"
SONAR_HOST="${SONAR_HOST_URL:-${SONAR_HOST_URL:-}}"

# Vérifie que SONAR_TOKEN est défini par l'environnement (CI)
if [ -z "${SONAR_TOKEN:-}" ]; then
  echo "ERROR: SONAR_TOKEN not set"
  exit 1
fi

# Installe SonarScanner (si nécessaire) — ici exemple wget pour sonar-scanner-cli
# Skip if runner already has sonar-scanner or the CI action installs it
if [ ! -x "$(command -v sonar-scanner)" ]; then
  echo "Installing sonar-scanner-cli..."
  SCANNER_DIR="$(mktemp -d)"
  wget -q -O "$SCANNER_DIR/sonar-scanner.zip" "https://binaries.sonarsource.com/Distribution/sonar-scanner-cli/sonar-scanner-cli-4.8.0.2856-linux.zip"
  unzip -q "$SCANNER_DIR/sonar-scanner.zip" -d "$SCANNER_DIR"
  export PATH="$SCANNER_DIR/sonar-scanner-*/bin:$PATH"
fi

# Lancer l'analyse
sonar-scanner \
  -Dsonar.host.url="${SONAR_HOST}" \
  -Dsonar.login="${SONAR_TOKEN}" \
  -Dsonar.projectKey="${PROJECT_KEY}" \
  -Dsonar.projectName="${PROJECT_NAME}" \
  -Dsonar.sources=. \
  -Dsonar.javascript.lcov.reportPaths=coverage/lcov.info \
  -Dsonar.branch.name="${GITHUB_REF##*/}" || true
