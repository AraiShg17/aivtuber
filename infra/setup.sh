#!/bin/bash
# GCP Infrastructure Setup for AI VTuber
# Run once per project before first deployment.
# Usage:  bash infra/setup.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Load project config (values can be overridden by environment variables)
# shellcheck source=infra/gcp.env
source "${SCRIPT_DIR}/gcp.env"

PROJECT_ID="${PROJECT_ID:-${GCP_PROJECT_ID}}"
REGION="${REGION:-${GCP_REGION}}"
REPO_NAME="${REPO_NAME:-${GCP_AR_REPO}}"
SERVICE_NAME="${SERVICE_NAME:-${GCP_MAIN_SERVICE}}"
VOICEVOX_SERVICE="${VOICEVOX_SERVICE:-${GCP_VOICEVOX_SERVICE}}"

echo "==> Project : ${PROJECT_ID}"
echo "==> Region  : ${REGION}"
echo ""

gcloud config set project "${PROJECT_ID}"

echo "==> Enabling APIs..."
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  firestore.googleapis.com \
  youtube.googleapis.com

echo "==> Creating Artifact Registry repository..."
gcloud artifacts repositories create "${REPO_NAME}" \
  --repository-format=docker \
  --location="${REGION}" \
  --description="AI VTuber container images" \
  --project="${PROJECT_ID}" || true

echo "==> Setting Artifact Registry cleanup policy (keep latest 3)..."
gcloud artifacts repositories set-cleanup-policies "${REPO_NAME}" \
  --location="${REGION}" \
  --project="${PROJECT_ID}" \
  --policy='[{"name":"keep-latest-3","action":{"type":"Keep"},"mostRecentVersions":{"packageNameFilter":".*","keepCount":3}}]'

echo "==> Creating Firestore database..."
gcloud firestore databases create \
  --location="${REGION}" \
  --project="${PROJECT_ID}" || true

# Secret Manager: OPEN_AI_API_KEY and YOUTUBE_API_KEY
# If already created in the Console, this step is skipped automatically.
echo "==> Ensuring Secret Manager secrets exist..."
for SECRET_NAME in OPEN_AI_API_KEY YOUTUBE_API_KEY; do
  if gcloud secrets describe "${SECRET_NAME}" --project="${PROJECT_ID}" &>/dev/null; then
    echo "    ${SECRET_NAME} already exists — skipping creation"
  else
    printf "Enter value for %s: " "${SECRET_NAME}"
    read -rs SECRET_VALUE
    echo
    echo -n "${SECRET_VALUE}" | gcloud secrets create "${SECRET_NAME}" \
      --project="${PROJECT_ID}" --data-file=-
  fi
done

echo "==> Deploying VOICEVOX to Cloud Run (internal ingress)..."
gcloud run deploy "${VOICEVOX_SERVICE}" \
  --image=voicevox/voicevox_engine:cpu-ubuntu20.04-latest \
  --region="${REGION}" \
  --platform=managed \
  --ingress=internal \
  --allow-unauthenticated \
  --port=50021 \
  --min-instances=0 \
  --max-instances=1 \
  --cpu=2 \
  --memory=4Gi \
  --project="${PROJECT_ID}"

VOICEVOX_URL=$(gcloud run services describe "${VOICEVOX_SERVICE}" \
  --region="${REGION}" \
  --project="${PROJECT_ID}" \
  --format='value(status.url)')

echo "==> Granting Cloud Build service account necessary roles..."
PROJECT_NUMBER=$(gcloud projects describe "${PROJECT_ID}" --format='value(projectNumber)')
CB_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"

for ROLE in roles/run.admin roles/iam.serviceAccountUser roles/secretmanager.secretAccessor; do
  gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
    --member="serviceAccount:${CB_SA}" \
    --role="${ROLE}"
done

echo ""
echo "==> Setup complete!"
echo ""
echo "Project ID   : ${PROJECT_ID}"
echo "VOICEVOX URL : ${VOICEVOX_URL}"
echo ""
echo "Next steps:"
echo "  1. Create a Cloud Build GitHub trigger in project '${PROJECT_ID}' for the main branch"
echo "  2. In the trigger, set substitution variable:"
echo "       _VOICEVOX_URL = ${VOICEVOX_URL}"
echo "  3. Set _YOUTUBE_API_KEY to your YouTube Data API v3 key"
echo "  4. Push to main to trigger the first deployment"
