#!/bin/bash

# Power VPN Production Installer
# Author: EHSANKiNG
# https://github.com/ehsanking/Power-VPN

set -e

echo -e "\e[1;36m====================================================\e[0m"
echo -e "\e[1;33m       ⚡ Power VPN Interactive Installer ⚡      \e[0m"
echo -e "\e[1;36m====================================================\e[0m"

# 1. System Requirements Check
if [[ $EUID -ne 0 ]]; then
   echo -e "\e[1;31m❌ This script must be run as root (use sudo)\e[0m"
   exit 1
fi

# 2. Gather Configuration
echo -e "\e[1;35m--- Configurations ---\e[0m"
read -p "🌐 Enter your domain name (e.g., vpn.yourdomain.com): " DOMAIN_NAME
read -p "📧 Enter your email for Let's Encrypt (SSL): " EMAIL_ADDRESS

read -p "👤 Enter Admin Username [admin]: " ADMIN_USER
ADMIN_USER=${ADMIN_USER:-admin}

read -s -p "🔑 Enter Admin Password [admin]: " ADMIN_PASS
echo ""
ADMIN_PASS=${ADMIN_PASS:-admin}

read -p "🛠 Enter MySQL Host [localhost]: " DB_HOST
DB_HOST=${DB_HOST:-localhost}

read -p "🛠 Enter MySQL Database Name [vpn]: " DB_NAME
DB_NAME=${DB_NAME:-vpn}

read -p "🛠 Enter MySQL User [root]: " DB_USER
DB_USER=${DB_USER:-root}

read -s -p "🛠 Enter MySQL Password: " DB_PASS
echo ""

# 3. System Updates & Dependencies
echo -e "\e[1;32m📦 Updating system and installing dependencies...\e[0m"
apt update && apt upgrade -y
apt install -y curl git nginx certbot python3-certbot-nginx mysql-client

# 5. Installing Node.js (v20)
if ! command -v node &> /dev/null; then
    echo -e "\e[1;32m🟢 Installing Node.js 20...\e[0m"
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
fi

# 6. Application Installation
echo -e "\e[1;32m📦 Installing npm dependencies...\e[0m"
npm install

# 4. Environment Setup
echo -e "\e[1;32m📄 Creating .env configuration...\e[0m"
ADMIN_HASH=$(node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('$ADMIN_PASS', 10));")

cat > .env <<EOF
# Database Settings
MYSQL_HOST=$DB_HOST
MYSQL_USER=$DB_USER
MYSQL_PASSWORD=$DB_PASS
MYSQL_DATABASE=$DB_NAME

# NextAuth / System Secret
JWT_SECRET=$(openssl rand -hex 32)
NEXTAUTH_SECRET=$(openssl rand -base64 32)
NEXTAUTH_URL=https://$DOMAIN_NAME

# Panel Settings
PORT=3000
ADMIN_USERNAME=$ADMIN_USER
ADMIN_PASSWORD_HASH=$ADMIN_HASH
EOF

echo -e "\e[1;32m🛠 Building the application...\e[0m"
npm run build

# 7. SSL Certificate Generation
echo -e "\e[1;32m🔐 Requesting SSL Certificate for $DOMAIN_NAME...\e[0m"
certbot --nginx -d $DOMAIN_NAME --non-interactive --agree-tos --email $EMAIL_ADDRESS

# 8. Nginx Configuration
echo -e "\e[1;32m⚙️ Configuring Nginx reverse proxy...\e[0m"
NGINX_CONF="/etc/nginx/sites-available/powervpn"

cat > $NGINX_CONF <<EOF
server {
    listen 80;
    server_name $DOMAIN_NAME;
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN_NAME;

    ssl_certificate /etc/letsencrypt/live/$DOMAIN_NAME/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN_NAME/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

ln -sf $NGINX_CONF /etc/nginx/sites-enabled/
# Remove default nginx config to avoid conflicts
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx

# 9. SSL Auto-Renewal (Cron) - Monthly
echo -e "\e[1;32m⏰ Setting up monthly SSL renewal check...\e[0m"
(crontab -l 2>/dev/null | grep -v certbot; echo "0 0 1 * * /usr/bin/certbot renew --quiet --renew-hook \"systemctl reload nginx\"") | crontab -

# 10. Summary
echo -e "\e[1;36m====================================================\e[0m"
echo -e "\e[1;32m✅ Installation Success!\e[0m"
echo -e "\e[1;36m====================================================\e[0m"
echo -e "🌐 \e[1;37mPanel URL:\e[0m https://$DOMAIN_NAME"
echo -e "👤 \e[1;37mAdmin User:\e[0m $ADMIN_USER"
echo -e "💡 \e[1;33mEnsure your MySQL Database ($DB_NAME) is created and schema imported.\e[0m"
echo -e "👉 \e[1;37mStart the app background:\e[0m nohup npm start &"
echo -e "📖 \e[1;37mView Logs:\e[0m tail -f nohup.out"
echo -e "⌨️  \e[1;37mCLI Manager:\e[0m chmod +x powervpn.sh && ./powervpn.sh"
echo -e "\e[1;36m====================================================\e[0m"

