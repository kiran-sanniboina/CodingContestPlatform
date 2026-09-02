# 🚀 Deployment Guide: Render (Web) + VPS (Judge)

This guide walks you through deploying the Coding Contest Platform using a split architecture:
- **Frontend & Backend**: Hosted on [Render](https://render.com) (Serverless/Cloud).
- **Database**: Hosted on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) (Cloud Database).
- **Judge Worker**: Hosted on a dedicated **VPS** (Virtual Private Server like DigitalOcean, AWS EC2, or Hetzner) to safely execute untrusted code in Docker sandboxes.

Follow these steps in order.

---

## Step 1: Prepare Your Code
Before starting, ensure your entire `coding-contest-platform` code is pushed to a GitHub or GitLab repository. Render connects directly to your git repository to deploy.

---

## Step 2: Set Up the Database (MongoDB Atlas)
Render does not host MongoDB natively, so we use MongoDB Atlas (which has a generous free tier).

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and create a free account.
2. Create a new **Free Cluster** (M0).
3. Under **Database Access**, create a new database user. Note the **Username** and **Password**.
4. Under **Network Access**, add an IP Address. Choose **Allow Access from Anywhere** (`0.0.0.0/0`) so Render can connect to it.
5. Click **Connect** on your cluster, choose **Connect your application**, and copy the **Connection String**.
   * It will look like this: `mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`
   * Replace `<username>` and `<password>` with the credentials from step 3.
   * Add the database name you want to use (e.g., `contest`) before the `?`. Example: `...mongodb.net/contest?...`

**Save this Connection String, you will need it for the Backend.**

---

## Step 3: Deploy Backend to Render

1. Log in to [Render](https://dashboard.render.com/) and click **New** -> **Web Service**.
2. Connect your GitHub/GitLab repository.
3. Fill in the deployment details:
   * **Name**: `contest-backend` (or whatever you like)
   * **Root Directory**: `backend`
   * **Environment**: `Docker`
   * **Region**: Choose the one closest to you.
   * **Instance Type**: Free or Starter.
4. Expand **Environment Variables** and add the following:
   * `MONGODB_URI`: *Paste your MongoDB Atlas Connection String from Step 2.*
   * `JWT_SECRET`: *Generate a random long string (e.g., `my-super-secret-jwt-key-2024-random`).*
   * `JUDGE_SHARED_SECRET`: *Generate a random string (e.g., `my-judge-secret-key-123`).*
   * `JUDGE_WORKER_URL`: `http://PLACEHOLDER:8081` *(We will update this in Step 6).*
   * `CONTEST_ENV`: `production`
5. Click **Create Web Service**. Wait for it to build and deploy.
6. Once live, copy your backend's URL from the top left (e.g., `https://contest-backend-xyz.onrender.com`).

---

## Step 4: Set Up Judge Worker on your VPS

You need a VPS running Ubuntu (22.04 or 24.04). SSH into your server as root or a user with sudo privileges.

**1. Install Docker and Git on the VPS:**
```bash
sudo apt update
sudo apt install -y git
curl -fsSL https://get.docker.com | sh
```

**2. Clone your repository:**
```bash
git clone <YOUR_GITHUB_REPO_URL> /opt/contest
cd /opt/contest/coding-contest-platform
```

**3. Start the Judge Worker using Docker Compose:**
We only want to run the `judge-worker` container on this VPS. 
First, create an environment file just for the judge:
```bash
cd infrastructure
nano .env
```
Paste this into the `.env` file (replace with your actual values):
```ini
# Replace with the URL of your Render backend from Step 3
BACKEND_INTERNAL_URL=https://contest-backend-xyz.onrender.com

# Replace with the EXACT SAME secret you used in Render Step 3
JUDGE_SHARED_SECRET=my-judge-secret-key-123
```
Save and exit (`Ctrl+O`, `Enter`, `Ctrl+X`).

Now, build and run *only* the judge worker:
```bash
docker compose up -d --build judge-worker
```

**4. Get your VPS Public IP:**
Run `curl ifconfig.me` to get your server's public IP address. Write this down.

---

## Step 5: Link Backend to Judge

Now that the Judge is running on the VPS, we need to tell the Render Backend how to reach it.

1. Go back to the Render Dashboard.
2. Open your `contest-backend` Web Service.
3. Go to **Environment**.
4. Edit the `JUDGE_WORKER_URL` variable.
   * Change it from `http://PLACEHOLDER:8081` to `http://<YOUR_VPS_PUBLIC_IP>:8081` (e.g., `http://203.0.113.50:8081`).
5. Click **Save Changes**. Render will automatically restart the backend with the new settings.

---

## Step 6: Deploy Frontend to Render

1. In Render, click **New** -> **Web Service**.
2. Connect your GitHub/GitLab repository again.
3. Fill in the deployment details:
   * **Name**: `contest-frontend`
   * **Root Directory**: `frontend`
   * **Environment**: `Docker` (Since you have a Dockerfile ready for the frontend, this is the easiest and most reliable way).
   * **Region**: Same as backend.
4. Expand **Environment Variables** and add:
   * `NEXT_PUBLIC_API_URL`: *Your Render backend URL (e.g., `https://contest-backend-xyz.onrender.com`).*
   * `NEXT_PUBLIC_WS_URL`: *Your Render backend URL, but replace `https://` with `wss://` and add `/ws` at the end (e.g., `wss://contest-backend-xyz.onrender.com/ws`).*
5. Click **Create Web Service**.

Wait for the frontend to build and deploy. 

---

## 🎉 You're Done!

Once the Frontend Web Service turns green in Render, click its URL. 
- You should see the login screen.
- Log in with `admin` / `admin123` to access the admin panel.
- Your platform is now fully deployed: UI/API on Render, Database on Atlas, and Code Execution safely isolated on your VPS!
