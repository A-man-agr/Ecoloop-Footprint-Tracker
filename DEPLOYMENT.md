# Google Cloud Platform (GCP) Deployment Guide

This guide walks you through deploying the **EcoLoop Carbon Footprint Tracker** to GCP. We have configured the project with files supporting four different deployment strategies. Choose the one that best suits your needs!

---

## Prerequisites
1. Install the [Google Cloud SDK (gcloud CLI)](https://cloud.google.com/sdk/docs/install).
2. Authenticate the CLI in your terminal:
   ```bash
   gcloud auth login
   ```
3. Set your active project:
   ```bash
   gcloud config set project YOUR_PROJECT_ID
   ```

---

## 🚀 Deployment Options

### Option 1: Google Cloud Run (Recommended & Modern)
Cloud Run runs containerized instances on a fully-managed serverless environment. We use a lightweight Alpine Nginx container to serve the static assets.

**Configuration Files:**
- `Dockerfile`: Configures Nginx base image and copies assets.
- `nginx.conf`: Directs requests to `index.html` and sets cache settings for static files on port 8080.

**Deploy Command:**
Run this in the project root:
```bash
gcloud run deploy ecoloop --source . --region us-central1 --allow-unauthenticated --port 8080
```
*GCP will automatically build the container via Cloud Build and launch the web server, providing you with a secure `https://...` URL.*

---

### Option 2: Google App Engine (Classic & Simple)
App Engine serves the website without managing containers directly, utilizing simple configuration rules.

**Configuration File:**
- `app.yaml`: Configures a Python runtime container mapped with static file handler rules.

**Deploy Command:**
Run this in the project root:
```bash
gcloud app deploy app.yaml
```
*Once finished, visit your live site by running:*
```bash
gcloud app browse
```

---

### Option 3: Google Cloud Storage Bucket (Ultra-Cheap Web Hosting)
Serving directly from a Cloud Storage bucket is the most cost-effective solution for pure static sites.

**Deploy Commands:**
1. Create a public bucket (replace `YOUR_UNIQUE_BUCKET_NAME` with a global unique name):
   ```bash
   gsutil mb gs://YOUR_UNIQUE_BUCKET_NAME
   ```
2. Enable website configuration specifying index and error fallback files:
   ```bash
   gsutil web set -m index.html -e index.html gs://YOUR_UNIQUE_BUCKET_NAME
   ```
3. Grant read access permissions to the public:
   ```bash
   gsutil iam ch allUsers:objectViewer gs://YOUR_UNIQUE_BUCKET_NAME
   ```
4. Sync your files up to the bucket:
   ```bash
   gsutil rsync -r . gs://YOUR_UNIQUE_BUCKET_NAME
   ```
*Your site will be live at: `http://YOUR_UNIQUE_BUCKET_NAME.storage.googleapis.com/`*

---

### Option 4: Firebase Hosting (GCP Integration)
Firebase is backed by GCP and is optimized for static hosting with worldwide CDNs and free SSL certificates.

**Configuration File:**
- `firebase.json`: Defines file paths, routing redirects, and upload ignores.

**Deploy Commands:**
1. Install Firebase CLI globally (requires Node.js):
   ```bash
   npm install -g firebase-tools
   ```
2. Link your project and initialize:
   ```bash
   firebase login
   firebase init hosting
   ```
3. Deploy to the web:
   ```bash
   firebase deploy
   ```

---

## 🛠️ Automated Deployment Tool
We have provided a utility command script `deploy-gcp.bat` for Windows users. Double-click it or run it from command prompt:
```cmd
deploy-gcp.bat
```
This script will interactively guide you through selecting a deployment path and executing the commands automatically.
