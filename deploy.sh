#!/bin/bash

# Ultron: Automated Google Cloud Deployment Script
# This script automates the build and deployment of the Ultron AI Assistant to Google Cloud Run.

# --- Configuration (Update these if necessary) ---
PROJECT_ID=$(gcloud config get-value project)
SERVICE_NAME="ultron-service"
REGION="us-central1"
IMAGE_TAG="gcr.io/$PROJECT_ID/$SERVICE_NAME"

echo "🚀 Starting Automated Deployment for Ultron..."

# 1. Build the Docker image using Cloud Build
echo "📦 Building Docker image on Cloud Build..."
gcloud builds submit --tag $IMAGE_TAG .

# 2. Deploy to Cloud Run
echo "🌍 Deploying to Google Cloud Run..."
gcloud run deploy $SERVICE_NAME \
  --image $IMAGE_TAG \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --port 3000

echo "✅ Deployment Complete!"
echo "🔗 Service is live at: $(gcloud run services describe $SERVICE_NAME --platform managed --region $REGION --format 'value(status.url)')"
