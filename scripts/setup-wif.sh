#!/usr/bin/env bash
#
# One-time setup: let GitHub Actions deploy to Cloud Run without a JSON key.
#
# Workload Identity Federation trades a short-lived GitHub OIDC token for GCP
# credentials at run time. Nothing long-lived is ever stored in GitHub, so
# there is no key to leak, rotate, or accidentally commit.
#
# Safe to re-run: every step tolerates the resource already existing.
#
# Usage:  bash scripts/setup-wif.sh

set -euo pipefail

PROJECT_ID="chatgrp-ai-prod"
PROJECT_NUMBER="589866597263"
REGION="us-central1"

# Must match the repository exactly, including capitalisation — GitHub sends it
# verbatim in the OIDC token and the attribute condition compares strings.
GITHUB_REPO="smitp1402/chatGRP"

POOL="github"
PROVIDER="github-actions"
SA_NAME="github-deployer"
SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
AR_REPO="chatgrp"

echo "==> Project ${PROJECT_ID} (${PROJECT_NUMBER}), repo ${GITHUB_REPO}"

# ─────────────────────────────────────────────────────────────
# 1. APIs. sts is the one that is currently missing; without it the token
#    exchange fails with a confusing permission error.
# ─────────────────────────────────────────────────────────────
echo "==> Enabling APIs"
gcloud services enable \
  sts.googleapis.com \
  iamcredentials.googleapis.com \
  cloudresourcemanager.googleapis.com \
  artifactregistry.googleapis.com \
  run.googleapis.com \
  --project "${PROJECT_ID}"

# ─────────────────────────────────────────────────────────────
# 2. Artifact Registry repo for the AI image.
#    The existing `cloud-run-source-deploy` repo is created implicitly by
#    `gcloud run deploy --source`; a dedicated repo keeps CI images separate
#    from anything deployed by hand.
# ─────────────────────────────────────────────────────────────
echo "==> Artifact Registry repository"
gcloud artifacts repositories create "${AR_REPO}" \
  --repository-format=docker \
  --location="${REGION}" \
  --description="Container images built by CI" \
  --project "${PROJECT_ID}" 2>/dev/null || echo "    already exists, skipping"

# ─────────────────────────────────────────────────────────────
# 3. Deploy service account — the identity GitHub borrows.
# ─────────────────────────────────────────────────────────────
echo "==> Service account"
gcloud iam service-accounts create "${SA_NAME}" \
  --display-name="GitHub Actions deployer" \
  --project "${PROJECT_ID}" 2>/dev/null || echo "    already exists, skipping"

echo "==> Granting roles"
# run.admin        — create revisions and route traffic
# artifactregistry.writer — push the image
# iam.serviceAccountUser  — act as the Cloud Run runtime service account
for ROLE in roles/run.admin roles/artifactregistry.writer roles/iam.serviceAccountUser; do
  gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="${ROLE}" \
    --condition=None \
    --quiet >/dev/null
  echo "    ${ROLE}"
done

# ─────────────────────────────────────────────────────────────
# 4. Workload Identity Pool + GitHub OIDC provider.
# ─────────────────────────────────────────────────────────────
echo "==> Workload identity pool"
gcloud iam workload-identity-pools create "${POOL}" \
  --location=global \
  --display-name="GitHub Actions" \
  --project "${PROJECT_ID}" 2>/dev/null || echo "    already exists, skipping"

echo "==> OIDC provider"
# The attribute-condition is the security boundary. Without it ANY GitHub
# repository on the internet could mint a token this project would accept.
gcloud iam workload-identity-pools providers create-oidc "${PROVIDER}" \
  --location=global \
  --workload-identity-pool="${POOL}" \
  --display-name="GitHub Actions OIDC" \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.repository_owner=assertion.repository_owner" \
  --attribute-condition="assertion.repository == '${GITHUB_REPO}'" \
  --project "${PROJECT_ID}" 2>/dev/null || echo "    already exists, skipping"

# ─────────────────────────────────────────────────────────────
# 5. Let that one repository impersonate the service account.
# ─────────────────────────────────────────────────────────────
echo "==> Binding repository to service account"
POOL_ID="projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL}"
gcloud iam service-accounts add-iam-policy-binding "${SA_EMAIL}" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/${POOL_ID}/attribute.repository/${GITHUB_REPO}" \
  --project "${PROJECT_ID}" \
  --quiet >/dev/null

# ─────────────────────────────────────────────────────────────
# Done — the two values GitHub needs.
# ─────────────────────────────────────────────────────────────
cat <<EOF

────────────────────────────────────────────────────────────────
Add these at:
  https://github.com/${GITHUB_REPO}/settings/secrets/actions

  GCP_WORKLOAD_IDENTITY_PROVIDER
  ${POOL_ID}/providers/${PROVIDER}

  GCP_SERVICE_ACCOUNT
  ${SA_EMAIL}
────────────────────────────────────────────────────────────────

Then trigger the workflow manually to verify:
  Actions -> "Deploy AI service" -> Run workflow
EOF
