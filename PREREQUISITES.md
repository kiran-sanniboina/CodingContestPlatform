# 📋 Prerequisites & Environment Setup Guide

This guide outlines the system requirements, software prerequisites, and installation instructions for running the **Coding Contest Platform** on any server or local development machine (Linux, macOS, or Windows).

---

## 💻 1. Minimum System & Hardware Requirements

| Resource | Minimum | Recommended (for 50+ Teams) |
| :--- | :--- | :--- |
| **Operating System** | Linux (Ubuntu/Arch/Debian), macOS, Windows 10/11 (WSL2) | Linux (Ubuntu 22.04 LTS or Arch Linux) |
| **CPU** | 2 Cores | 4 to 8 Cores (for parallel sandbox code execution) |
| **Memory (RAM)** | 4 GB | 8 GB to 16 GB |
| **Disk Space** | 10 GB Free Storage | 20 GB+ SSD |
| **Network** | Local Wi-Fi Router / Ethernet or Internet Connection | Gigabit LAN / High-speed Broadband |

---

## 🐳 2. Primary Requirement: Docker & Docker Compose

The entire platform runs in containerized microservices managed by **Docker Compose**. You only need Docker installed on your host machine to run everything.

### 🐧 A. On Arch Linux / Manjaro
```bash
# 1. Install Docker and Docker Compose
sudo pacman -Syu docker docker-compose

# 2. Start and enable Docker service
sudo systemctl enable --now docker.service

# 3. Add your current user to the docker group (avoids needing sudo)
sudo usermod -aG docker $USER

# 4. Apply group changes (or log out and log back in)
newgrp docker

# 5. Verify Docker is running
docker --version
docker compose version
```

### 🐧 B. On Ubuntu / Debian
```bash
# 1. Update package list and install Docker
sudo apt update
sudo apt install -y docker.io docker-compose-v2

# 2. Start and enable Docker
sudo systemctl enable --now docker

# 3. Add current user to docker group
sudo usermod -aG docker $USER
newgrp docker

# 4. Verify installation
docker --version
docker compose version
```

### 🪟 C. On Windows 10 & 11
1. Install **[Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/)**.
2. During installation, ensure the **WSL 2 Backend** option is checked.
3. Start Docker Desktop and verify in PowerShell:
   ```powershell
   docker --version
   docker compose version
   ```

### 🍏 D. On macOS
1. Install **[Docker Desktop for Mac](https://www.docker.com/products/docker-desktop/)** (Apple Silicon or Intel).
2. Start Docker Desktop and verify in Terminal:
   ```bash
   docker --version
   docker compose version
   ```

---

## 🌐 3. Network Ports & Firewall Configuration

Ensure the following ports on the host machine are free and not blocked by other services:

| Port | Service | Description | Scope |
| :--- | :--- | :--- | :--- |
| **`3000`** | Next.js Frontend | Participant Code Arena & Admin Dashboard | Public / LAN |
| **`8080`** | Spring Boot Backend | REST API & WebSocket Engine | Internal / Docker Network |
| **`8081`** | Judge Worker | Dry-run & Sample Execution Runner | Internal / Docker Network |
| **`27017`** | MongoDB | Contest Database Storage | Internal / Docker Network |

### Allowing Ports in Firewall (Linux):
* **UFW (Ubuntu/Debian):**
  ```bash
  sudo ufw allow 3000/tcp
  sudo ufw reload
  ```
* **Firewalld (Fedora/RHEL/CentOS):**
  ```bash
  sudo firewall-cmd --permanent --add-port=3000/tcp
  sudo firewall-cmd --reload
  ```

---

## 🚀 4. Remote Tunneling Prerequisites (Optional)

If hosting the contest on an internal laptop/server and sharing access over the internet with remote participants:

### Option A: Pinggy (Zero-installation — Uses built-in OpenSSH)
* **Requirement:** Native `ssh` client (pre-installed on Linux, macOS, and Windows).
* **Command:**
  ```bash
  ssh -p 443 -R 0:localhost:3000 qr@a.pinggy.io
  ```

### Option B: Cloudflare Tunnel (`cloudflared`)
* **Arch Linux:** `sudo pacman -S cloudflared`
* **Ubuntu/Debian:** `sudo apt install cloudflared`
* **Windows:** `winget install Cloudflare.cloudflared`
* **Command:**
  ```bash
  cloudflared tunnel --url http://localhost:3000
  ```

### Option C: Ngrok
* **Command:**
  ```bash
  ngrok http 3000
  ```

---

## 🛠️ 5. Optional Prerequisites (For Bare-Metal Dev Without Docker)

If you plan to develop and run the backend or frontend directly on your host machine without containers:

* **Java Development Kit (JDK):** Version `21` (Eclipse Temurin or OpenJDK 21)
  * Verify: `java -version`
* **Apache Maven:** Version `3.9+`
  * Verify: `mvn -version`
* **Node.js & npm:** Node.js `v18.17+` or `v20+` & npm `9+`
  * Verify: `node -v` && `npm -v`
* **MongoDB Community Server:** Version `6.0+` or `7.0+`
  * Verify: `mongod --version`
* **C++ Compiler:** `g++` (supporting C++20 standard)
  * Verify: `g++ --version`
* **Python Interpreter:** Python `3.10+`
  * Verify: `python3 --version`

---

## ✅ 6. Verification Checklist

Before starting the contest, run this quick check:

- [ ] Docker service is active (`docker info`)
- [ ] Docker Compose is available (`docker compose version`)
- [ ] Port `3000` is open and accessible
- [ ] Contest repository cloned (`git clone https://github.com/kiran-sanniboina/CodingContestPlatform.git`)
- [ ] Containers built and started (`docker compose up -d --build`)

