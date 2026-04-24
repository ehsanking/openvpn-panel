#!/bin/bash

# OpenVPN Panel Production Installer
# https://github.com/ehsanking/openvpn-panel

set -e

echo "🛡️ OpenVPN Panel Production Installer"
echo "--------------------------------------"

# 1. System Requirements Check
if [[ $EUID -ne 0 ]]; then
   echo "❌ This script must be run as root (use sudo)"
   exit 1
fi

# 2. Gather Configuration
read -p "🌐 Enter your domain name (e.g., vpn.yourdomain.com): " DOMAIN_NAME
read -p "📧 Enter your email for Let's Encrypt: " EMAIL_ADDRESS

# 3. System Updates & Dependencies
echo "📦 Updating system and installing dependencies..."
apt update && apt upgrade -y
apt install -y curl git nginx certbot python3-certbot-nginx mysql-client

# 4. Environment Setup
if [ ! -f .env ]; then
    echo "📄 Creating .env from template..."
    cp .env.example .env
    echo "⚠️  Please ensure you manually update .env with your MySQL credentials!"
fi

# 5. Installing Node.js (v20)
if ! command -v node &> /dev/null; then
    echo "🟢 Installing Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
fi

# 6. Application Installation
echo "📦 Installing npm dependencies..."
npm install

echo "🛠 Building the application..."
NODE_ENV=production npm run build

# 7. SSL Certificate Generation
echo "🔐 Requesting SSL Certificate for $DOMAIN_NAME..."
certbot --nginx -d $DOMAIN_NAME --non-interactive --agree-tos --email $EMAIL_ADDRESS

# 8. Nginx Configuration
echo "⚙️ Configuring Nginx reverse proxy..."
NGINX_CONF="/etc/nginx/sites-available/vpn-panel"

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
nginx -t && systemctl restart nginx

# 9. SSL Auto-Renewal (Cron)
echo "⏰ Setting up daily SSL renewal check..."
(crontab -l 2>/dev/null; echo "0 0 * * * /usr/bin/certbot renew --quiet") | crontab -

# 10. Summary
echo ""
echo "✅ Installation Success!"
echo "--------------------------------------"
echo "🌐 Panel URL: https://$DOMAIN_NAME"
echo "👉 Start the app background: nohup npm start &"
echo "📖 Logs: tail -f nohup.out"
echo "--------------------------------------"
