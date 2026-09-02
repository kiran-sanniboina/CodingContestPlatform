# 🖥️ Turn an Old PC / Laptop into a Dedicated Contest VPS Server

A complete, step-by-step guide to transforming an old laptop or desktop PC (running Arch Linux, Ubuntu, or Debian) into a high-performance, 24/7 self-hosted server for the **Coding Contest Platform**.

---

## 📑 Table of Contents
1. [BIOS & Hardware Preparation](#1-bios--hardware-preparation)
2. [Operating System Configuration (Power & Lid Settings)](#2-operating-system-configuration)
3. [SSH & Headless Remote Access](#3-ssh--headless-remote-access)
4. [Docker & Docker Compose Installation](#4-docker--docker-compose-installation)
5. [Deploying the Contest Platform](#5-deploying-the-contest-platform)
6. [Auto-Start Stack on Boot (systemd Service)](#6-auto-start-stack-on-boot)
7. [Exposing to Participants (LAN & Public Internet)](#7-exposing-to-participants)
8. [Monitoring & Server Maintenance](#8-monitoring--server-maintenance)

---

## ⚡ 1. BIOS & Hardware Preparation

Before booting up your old PC:

1. **Connect via Ethernet Cable (Recommended):**
   * While Wi-Fi works, an Ethernet cable connected directly to your router provides lower latency and prevents random disconnection drops during heavy submissions.
2. **Configure BIOS Power Options:**
   * Restart your PC and press `F2`, `F10`, `F12`, or `Del` to enter BIOS.
   * Look for **Power Management** ➡️ **Restore on AC / Power Loss** and set it to **"Power On"** or **"Last State"**.
   * *Benefit:* If the power goes out, the PC will automatically turn back on when power is restored.

---

## 💤 2. Operating System Configuration

If using an **old laptop**, prevent it from going to sleep or suspending when the lid is closed:

### Prevent Sleep on Lid Close (systemd):
Open `/etc/systemd/logind.conf` with root permissions:
```bash
sudo nano /etc/systemd/logind.conf
```
Find and set the following lines (uncomment by removing `#`):
```ini
[Login]
HandleLidSwitch=ignore
HandleLidSwitchExternalPower=ignore
HandleLidSwitchDocked=ignore
IdleAction=ignore
```
Save and apply changes:
```bash
sudo systemctl restart systemd-logind
```
*Now you can close the laptop lid and place it on a shelf; it will remain running 24/7.*

---

## 🔑 3. SSH & Headless Remote Access

Run your old PC "headlessly" (without needing a monitor, keyboard, or mouse plugged in) by connecting from your main computer via SSH.

### A. Enable SSH on the Old PC:
```bash
# Arch Linux / Manjaro
sudo pacman -S openssh
sudo systemctl enable --now sshd

# Ubuntu / Debian
sudo apt install -y openssh-server
sudo systemctl enable --now ssh
```

### B. Find the Old PC's Local IP Address:
```bash
hostname -I | awk '{print $1}'
# Example Output: 192.168.1.50
```

### C. Connect from your Main Laptop / PC:
From your Windows Terminal, macOS Terminal, or Linux terminal:
```bash
ssh username@192.168.1.50
```

*(Tip: In your home Wi-Fi router settings, bind this MAC address to a **Static DHCP IP** so the IP never changes).*

---

## 🐳 4. Docker & Docker Compose Installation

### On Arch Linux:
```bash
sudo pacman -Syu docker docker-compose
sudo systemctl enable --now docker.service
sudo usermod -aG docker $USER
newgrp docker
```

### On Ubuntu / Debian:
```bash
sudo apt update
sudo apt install -y docker.io docker-compose-v2
sudo systemctl enable --now docker
sudo usermod -aG docker $USER
newgrp docker
```

Verify Docker is active:
```bash
docker info
docker compose version
```

---

## 🚀 5. Deploying the Contest Platform

### A. Clone the Repository:
```bash
cd ~
git clone https://github.com/kiran-sanniboina/CodingContestPlatform.git
cd CodingContestPlatform/coding-contest-platform/infrastructure
```

### B. Build and Start the Stack:
```bash
docker compose up -d --build
```

### C. Verify Running Containers:
```bash
docker ps
```
You should see all 4 containers healthy and running:
* `contest_frontend` (Port `3000`)
* `contest_backend` (Port `8080`)
* `contest_judge_worker` (Port `8081`)
* `contest_mongodb` (Port `27017`)

---

## 🔄 6. Auto-Start Stack on Boot

To ensure the entire platform starts automatically whenever the PC boots (without you needing to log in or run commands), create a `systemd` service:

### A. Create the Service File:
```bash
sudo nano /etc/systemd/system/coding-contest.service
```

### B. Paste the following configuration:
*(Replace `YOUR_USERNAME` with your Linux username, e.g. `kiran` or `user`)*

```ini
[Unit]
Description=Coding Contest Platform Docker Compose Stack
Requires=docker.service
After=docker.service network-online.target
Wants=network-online.target

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/home/YOUR_USERNAME/CodingContestPlatform/coding-contest-platform/infrastructure
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
```

### C. Enable and Start the Service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable coding-contest.service
```
*Now, whenever the PC restarts or boots up, the contest platform automatically comes online!*

---

## 🌐 7. Exposing to Participants

Choose the method that fits your event:

### 🏢 Option 1: In-Person Campus / Lab Wi-Fi (Lowest Latency — Recommended)
If all participants are in the same building or on the same Wi-Fi network:

1. Allow port `3000` through the firewall:
   ```bash
   # If using UFW:
   sudo ufw allow 3000/tcp
   ```
2. Find the server's local IP:
   ```bash
   hostname -I | awk '{print $1}'
   # e.g., 192.168.1.50
   ```
3. Share the URL with participants:
   ```text
   http://192.168.1.50:3000
   ```

---

### 🌍 Option 2: Remote Access via Pinggy (Instant Public HTTPS)
Expose the platform to the internet with **zero software installation**:

```bash
ssh -p 443 -R 0:localhost:3000 qr@a.pinggy.io
```
*(Press Enter when prompted for password. It outputs an instant public HTTPS link).*

#### Run Pinggy in Background as a Service (24/7):
```bash
nohup ssh -o ServerAliveInterval=30 -p 443 -R 0:localhost:3000 qr@a.pinggy.io > pinggy.log 2>&1 &
```
View the generated URL anytime:
```bash
cat pinggy.log | grep -o 'https://[^ ]*' | head -n 1
```

---

### 🛡️ Option 3: Remote Access via Cloudflare Tunnel (Enterprise Grade)
1. Install `cloudflared`:
   ```bash
   # Arch Linux
   sudo pacman -S cloudflared

   # Ubuntu / Debian
   sudo apt install -y cloudflared
   ```
2. Start quick tunnel:
   ```bash
   cloudflared tunnel --url http://localhost:3000
   ```

---

## 📊 8. Monitoring & Server Maintenance

### View Live Resource Usage (CPU & RAM):
```bash
docker stats
```

### View Live Logs:
* **Backend API & Auth:**
  ```bash
  docker logs -f contest_backend
  ```
* **Judge Sandbox Execution:**
  ```bash
  docker logs -f contest_judge_worker
  ```
* **Frontend:**
  ```bash
  docker logs -f contest_frontend
  ```

### Pull Updates & Rebuild:
```bash
cd ~/CodingContestPlatform
git pull origin main
cd coding-contest-platform/infrastructure
docker compose up -d --build
```

### Clean Up Unused Docker Caches (Freeing Disk Space):
```bash
docker system prune -f
```
