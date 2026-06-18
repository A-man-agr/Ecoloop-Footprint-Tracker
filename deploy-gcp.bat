@echo off
echo ===================================================
echo EcoLoop Google Cloud Platform Deployment Automator
echo ===================================================
echo.
echo Make sure you have installed the Google Cloud SDK (gcloud) 
echo and run 'gcloud auth login' and 'gcloud config set project [PROJECT_ID]'.
echo.
echo Please choose a deployment target:
echo [1] Google Cloud Run (Containerized Nginx Serverless - Recommended)
echo [2] Google App Engine (Static Handlers Environment)
echo [3] Google Cloud Storage Bucket (Pure Static Web Hosting)
echo [4] Firebase Hosting (GCP Static Hosting Service)
echo [5] Exit
echo.
set /p opt="Enter your option (1-5): "

if "%opt%"=="1" goto CLOUDRUN
if "%opt%"=="2" goto APPENGINE
if "%opt%"=="3" goto CLOUDSTORAGE
if "%opt%"=="4" goto FIREBASE
if "%opt%"=="5" goto EXIT
goto INVALID

:CLOUDRUN
echo.
echo Deploying to Google Cloud Run...
set /p service_name="Enter Cloud Run service name [ecoloop]: "
if "%service_name%"=="" set service_name=ecoloop
set /p region="Enter GCP Region [us-central1]: "
if "%region%"=="" set region=us-central1
echo Executing build and deploy...
gcloud run deploy %service_name% --source . --region %region% --allow-unauthenticated --port 8080
goto END

:APPENGINE
echo.
echo Deploying to Google App Engine...
gcloud app deploy app.yaml
goto END

:CLOUDSTORAGE
echo.
echo Deploying to Google Cloud Storage...
set /p bucket_name="Enter your Cloud Storage Bucket Name (e.g. ecoloop-web-bucket): "
if "%bucket_name%"=="" goto ERR_BUCKET
echo Creating bucket if not exists...
gsutil mb gs://%bucket_name%
echo Configuring bucket for static website hosting...
gsutil web set -m index.html -e index.html gs://%bucket_name%
echo Making all uploaded items public...
gsutil iam ch allUsers:objectViewer gs://%bucket_name%
echo Syncing files to bucket...
gsutil rsync -r . gs://%bucket_name%
echo.
echo Your site is live at: http://%bucket_name%.storage.googleapis.com/
goto END

:ERR_BUCKET
echo Bucket name is required for Cloud Storage.
goto END

:FIREBASE
echo.
echo Deploying to Firebase Hosting...
echo Ensuring Firebase CLI tool is logged in...
call firebase login
echo Deploying site...
call firebase deploy
goto END

:INVALID
echo Invalid option selected.
goto END

:EXIT
echo Exiting deployment tool.
exit /b 0

:END
echo.
echo Deployment action completed! Press any key to exit.
pause > nul
