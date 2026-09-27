#!/usr/bin/env bash
# ==============================================================================
# CareerX Production VPS Setup Script (Ubuntu 22.04 / 24.04 LTS)
# ==============================================================================
# Usage:
#   chmod +x scripts/setup-vps.sh
#   sudo ./scripts/setup-vps.sh
# ==============================================================================

set -euo pipefail

echo "===================================================================="
echo " Starting CareerX Ubuntu VPS Provisioning & Docker Setup"
echo "===================================================================="

# 1. Update system packages
echo "--> [1/6] Updating APT repositories and system packages..."
apt-get update -y
apt-get upgrade -y
apt-get install -y --no-install-recommends \
    curl \
    git \
    ufw \
    ca-certificates \
    gnupg \
    lsb-release \
    fail2ban

# 2. Install official Docker Engine and Docker Compose Plugin
echo "--> [2/6] Installing official Docker Engine & Docker Compose plugin..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm -f get-docker.sh
else
    echo "Docker is already installed."
fi

# Ensure docker compose plugin is available
apt-get install -y docker-compose-plugin

# 3. Configure Docker service & user permissions
echo "--> [3/6] Configuring Docker permissions & daemon..."
systemctl enable docker
systemctl start docker

# Add invoking user or current user to docker group
TARGET_USER="${SUDO_USER:-$USER}"
if [ -n "$TARGET_USER" ] && [ "$TARGET_USER" != "root" ]; then
    usermod -aG docker "$TARGET_USER"
    echo "Added user '$TARGET_USER' to the 'docker' group."
fi

# 4. Firewall Configuration (UFW)
echo "--> [4/6] Configuring UFW Firewall (SSH, HTTP, HTTPS)..."
ufw allow OpenSSH
ufw allow 80/tcp comment 'HTTP / Nginx Ingress'
ufw allow 443/tcp comment 'HTTPS / SSL Ingress'
# Do NOT expose 8000, 27017, or 6379 directly to public
ufw --force enable
ufw status verbose

# 5. Application Directory Setup
echo "--> [5/6] Setting up CareerX deployment directory..."
APP_DIR="/opt/careerx"

if [ ! -d "$APP_DIR" ]; then
    echo "Cloning repository into $APP_DIR..."
    git clone https://github.com/Sujaykumar960/Job-Application-Tracker.git "$APP_DIR"
else
    echo "Directory $APP_DIR already exists. Pulling latest main..."
    cd "$APP_DIR" && git pull origin main
fi

cd "$APP_DIR"

if [ -n "$TARGET_USER" ] && [ "$TARGET_USER" != "root" ]; then
    chown -R "$TARGET_USER:$TARGET_USER" "$APP_DIR"
fi

# 6. Environment file preparation
if [ ! -f "$APP_DIR/.env" ]; then
    echo "Creating .env from .env.production.example..."
    cp "$APP_DIR/.env.production.example" "$APP_DIR/.env"
    chmod 600 "$APP_DIR/.env"
    echo "Created $APP_DIR/.env with mode 600."
    echo "IMPORTANT: Edit $APP_DIR/.env with your production credentials!"
else
    echo "$APP_DIR/.env already exists. Preserving existing configuration."
    chmod 600 "$APP_DIR/.env"
fi

echo "===================================================================="
echo " CareerX VPS Setup Completed Successfully!"
echo "===================================================================="
echo "Next Steps:"
echo "1. Run: newgrp docker (or log out and log back in)"
echo "2. Edit your production secrets in $APP_DIR/.env:"
echo "     nano $APP_DIR/.env"
echo "3. Launch the production stack:"
echo "     cd $APP_DIR"
echo "     docker compose -f docker-compose.prod.yml up -d --build"
echo "4. Verify status:"
echo "     docker compose -f docker-compose.prod.yml ps"
echo "===================================================================="
