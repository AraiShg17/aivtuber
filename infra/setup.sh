#!/bin/bash
# GCP Infrastructure Setup for AI VTuber
# Run once before first deployment.
# Usage: PROJECT_ID=your-project-id bash infra/setup.sh

set -euo pipefail

PROJECT_ID="${PROJECT_ID:?Set PROJECT_ID environment variable}"
REGION="asia-northeast1"
REPO_NAME="aivtuber"
SERVICE_NAME="aivtuber"
VOICEVOX_SERVICE="voicevox"

gcloud config set project "$PROJECT_ID"

echo "==> Enabling APIs..."
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  firestore.googleapis.com \
  youtube.googleapis.com

echo "==> Creating Artifact Registry repository..."
gcloud artifacts repositories create "$REPO_NAME" \
  --repository-format=docker \
  --location="$REGION" \
  --description="AI VTuber container images" || true

echo "==> Setting Artifact Registry cleanup policy (keep latest 3)..."
gcloud artifacts repositories set-cleanup-policies "$REPO_NAME" \
  --location="$REGION" \
  --policy='[{"name":"keep-latest-3","action":{"type":"Keep"},"mostRecentVersions":{"packageNameFilter":".*","keepCount":3}}]'

echo "==> Creating Firestore database..."
gcloud firestore databases create --location="$REGION" || true

echo "==> Creating OpenAI API key secret (enter key when prompted)..."
printf "Enter OpenAI API key: "
read -rs OPENAI_KEY
echo
echo -n "$OPENAI_KEY" | gcloud secrets create openai-api-key --data-file=- || \
  echo -n "$OPENAI_KEY" | gcloud secrets versions add openai-api-key --data-file=-

echo "==> Deploying VOICEVOX to Cloud Run (internal ingress)..."
gcloud run deploy "$VOICEVOX_SERVICE" \
  --image=voicevox/voicevox_engine:cpu-ubuntu20.04-latest \
  --region="$REGION" \
  --platform=managed \
  --ingress=internal \
  --allow-unauthenticated \
  --port=50021 \
  --min-instances=0 \
  --max-instances=1 \
  --cpu=2 \
  --memory=4Gi

VOICEVOX_URL=$(gcloud run services describe "$VOICEVOX_SERVICE" \
  --region="$REGION" --format='value(status.url)')

echo "==> Granting Cloud Build service account necessary roles..."
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')
CB_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${CB_SA}" \
  --role="roles/run.admin"
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${CB_SA}" \
  --role="roles/iam.serviceAccountUser"
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${CB_SA}" \
  --role="roles/secretmanager.secretAccessor"

echo ""
echo "==> Setup complete!"
echo ""
echo "VOICEVOX internal URL: $VOICEVOX_URL"
echo ""
echo "Next steps:"
echo "1. Create Cloud Build GitHub trigger for main branch"
echo "2. Set _VOICEVOX_URL substitution to: $VOICEVOX_URL"
echo "3. Set _YOUTUBE_API_KEY substitution to your YouTube Data API v3 key"
echo "4. Push to main branch to trigger first deployment"
