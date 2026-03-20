# HOW TO DEPLOY VISIONARY SCHOOL SYSTEM ONLINE
# ================================================
# Free hosting on Render.com — no credit card needed

## STEP 1 — Push your backend to GitHub
#
# 1. Go to github.com and create a free account
# 2. Create a new repository called: visionary-backend
# 3. In your terminal (inside the visionary-backend folder) run:
#
#    git init
#    git add .
#    git commit -m "Visionary School Backend"
#    git branch -M main
#    git remote add origin https://github.com/YOUR_USERNAME/visionary-backend.git
#    git push -u origin main

## STEP 2 — Deploy backend on Render
#
# 1. Go to render.com and sign up (free)
# 2. Click "New +" → "Web Service"
# 3. Connect your GitHub account and select visionary-backend
# 4. Fill in these settings:
#
#    Name:           visionary-school-api
#    Runtime:        Node
#    Build Command:  npm install
#    Start Command:  npm start
#
# 5. Add Environment Variables (click "Add Environment Variable" for each):
#
#    PORT           = 10000
#    NODE_ENV       = production
#    DB_HOST        = (from step 3 below)
#    DB_PORT        = 5432
#    DB_NAME        = visionary_school
#    DB_USER        = (from step 3 below)
#    DB_PASSWORD    = (from step 3 below)
#    JWT_SECRET     = visionary_school_super_secret_2026_prod
#    JWT_EXPIRES_IN = 7d
#    CLIENT_URL     = * 
#
# 6. Click "Create Web Service"
# 7. Render will give you a URL like: https://visionary-school-api.onrender.com

## STEP 3 — Free PostgreSQL database on Render
#
# 1. In Render dashboard, click "New +" → "PostgreSQL"
# 2. Name it: visionary-db
# 3. Select Free plan
# 4. Click "Create Database"
# 5. Copy the connection details (Host, Username, Password, Database name)
#    and paste them into the Web Service environment variables above
#
# 6. In your terminal, update your .env to use the Render DB, then run:
#    npm run db:setup
#    npm run db:seed

## STEP 4 — Update your frontend api.js
#
# Open api.js and change line 4 from:
#    const API_URL = 'http://localhost:5000/api';
# To:
#    const API_URL = 'https://your-app-name.onrender.com/api';

## STEP 5 — Deploy frontend on Netlify (free)
#
# 1. Go to netlify.com and sign up
# 2. Drag and drop your visionary-connected folder onto the Netlify dashboard
# 3. Netlify gives you a URL like: https://visionary-school.netlify.app
# 4. Share that URL with anyone — the system is live!

## DONE! Your school system is now on the internet 🎉
