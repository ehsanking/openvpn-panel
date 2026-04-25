#!/bin/bash
# Power VPN Panel — Full Installer
set -Eeuo pipefail

REPO_URL="https://github.com/ehsanking/Power-VPN.git"
INSTALL_DIR="/opt/powervpn"
SERVICE_USER="vpnpanel"
SERVICE_FILE="/etc/systemd/system/powervpn.service"
CRED_FILE="$INSTALL_DIR/.panel_credentials.txt"
NODE_MAJOR=20

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
info()    { echo -e "${CYAN}[INFO]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
die()     { echo -e "${RED}[ERROR]${NC} $*" >&2; exit 1; }

# ── Failure summary on unexpected exit ───────────────────────────────────────
INSTALL_OK=0
on_exit() {
    local rc=$?
    if [[ "$INSTALL_OK" -eq 0 ]]; then
        echo
        echo -e "${RED}======================================================${NC}"
        echo -e "${RED}   Power VPN installation FAILED (exit code ${rc})${NC}"
        echo -e "${RED}======================================================${NC}"
        echo -e "  Last failed command: ${YELLOW}${BASH_COMMAND:-unknown}${NC}"
        echo -e "  Re-run the installer after fixing the cause."
        echo -e "  Logs: ${CYAN}journalctl -xe${NC} or ${CYAN}/var/log/syslog${NC}"
        echo -e "${RED}======================================================${NC}"
    fi
}
trap on_exit EXIT

require_root() {
    [[ $EUID -eq 0 ]] || die "Please run as root: sudo bash install.sh"
}

generate_password() {
    LC_ALL=C tr -dc 'A-Za-z0-9!@#%^&*_+' < /dev/urandom | head -c 20
}

generate_secret() {
    LC_ALL=C tr -dc 'A-Za-z0-9' < /dev/urandom | head -c 48
}

# ── Collect admin credentials ─────────────────────────────────────────────────
collect_credentials() {
    echo -e "\n${CYAN}====== Power VPN Panel Installer ======${NC}\n"

    while true; do
        read -rp "Enter Admin Username (min 5 chars): " ADMIN_USER
        [[ ${#ADMIN_USER} -ge 5 ]] && break
        warn "Username must be at least 5 characters."
    done

    read -s -rp "Enter Admin Password (leave blank for random): " ADMIN_PASS
    echo
    if [[ -z "$ADMIN_PASS" ]]; then
        ADMIN_PASS=$(generate_password)
        echo -e "  Generated password: ${YELLOW}${ADMIN_PASS}${NC}"
    fi

    read -rp "Enter Panel Port (default 3000): " PANEL_PORT
    PANEL_PORT=${PANEL_PORT:-3000}
    [[ "$PANEL_PORT" =~ ^[0-9]+$ ]] || PANEL_PORT=3000

    DOMAIN=""
    LE_EMAIL=""
    read -rp "Use a domain with HTTPS (Let's Encrypt)? [y/N]: " USE_DOMAIN
    if [[ "${USE_DOMAIN,,}" == "y" || "${USE_DOMAIN,,}" == "yes" ]]; then
        while true; do
            read -rp "Enter your domain (e.g. panel.example.com): " DOMAIN
            if [[ "$DOMAIN" =~ ^[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?(\.[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?)+$ ]]; then
                break
            fi
            warn "Invalid domain format. Try again."
        done
        while true; do
            read -rp "Enter email for Let's Encrypt notifications: " LE_EMAIL
            if [[ "$LE_EMAIL" =~ ^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$ ]]; then
                break
            fi
            warn "Invalid email. Try again."
        done
    fi
}

# ── System dependencies ───────────────────────────────────────────────────────
install_dependencies() {
    info "Updating package lists…"
    apt-get update -qq

    info "Installing system packages…"
    apt-get install -y -qq \
        curl git ca-certificates gnupg lsb-release \
        mysql-server openssl ufw 2>/dev/null || \
    apt-get install -y -qq \
        curl git ca-certificates gnupg \
        mariadb-server openssl ufw

    # Node.js via NodeSource
    if ! command -v node &>/dev/null || [[ "$(node -e 'process.stdout.write(process.versions.node.split(".")[0])')" -lt "$NODE_MAJOR" ]]; then
        info "Installing Node.js ${NODE_MAJOR}…"
        curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash - >/dev/null
        apt-get install -y -qq nodejs
    fi
    success "Node.js $(node -v) ready."

    # Nginx + Certbot when a domain is configured
    if [[ -n "$DOMAIN" ]]; then
        info "Installing nginx and certbot for ${DOMAIN}…"
        apt-get install -y -qq nginx certbot python3-certbot-nginx
        success "nginx + certbot installed."
    fi
}

# ── MySQL setup ───────────────────────────────────────────────────────────────
# Detect which database service is installed
detect_db_service() {
    if systemctl list-unit-files 2>/dev/null | grep -q '^mariadb\.service'; then
        DB_SERVICE="mariadb"
    elif systemctl list-unit-files 2>/dev/null | grep -q '^mysql\.service'; then
        DB_SERVICE="mysql"
    elif [[ -f /etc/init.d/mariadb ]]; then
        DB_SERVICE="mariadb"
    elif [[ -f /etc/init.d/mysql ]]; then
        DB_SERVICE="mysql"
    else
        DB_SERVICE="mysql"
    fi
}

# Check if MySQL/MariaDB is responsive
is_db_running() {
    mysqladmin ping -u root --silent 2>/dev/null
}

# Start the database service trying multiple methods (systemd → service → init.d → direct)
start_db_service() {
    # Already running?
    if is_db_running; then
        return 0
    fi

    # 1) systemd (works on most VMs / bare metal)
    if command -v systemctl &>/dev/null && [[ -d /run/systemd/system ]]; then
        info "Enabling and starting ${DB_SERVICE} via systemd…"
        if timeout 30 systemctl enable --now "${DB_SERVICE}" 2>/dev/null; then
            sleep 2
            is_db_running && return 0
        fi
    fi

    # 2) SysV / service wrapper (containers without systemd)
    if command -v service &>/dev/null; then
        info "Starting ${DB_SERVICE} via 'service' command…"
        service "${DB_SERVICE}" start 2>/dev/null || true
        sleep 2
        is_db_running && return 0
    fi

    # 3) /etc/init.d
    if [[ -x "/etc/init.d/${DB_SERVICE}" ]]; then
        info "Starting ${DB_SERVICE} via /etc/init.d…"
        "/etc/init.d/${DB_SERVICE}" start 2>/dev/null || true
        sleep 2
        is_db_running && return 0
    fi

    # 4) Direct daemon start (last-resort, e.g. unprivileged containers)
    if command -v mysqld_safe &>/dev/null; then
        info "Starting mysqld_safe in background…"
        mkdir -p /var/run/mysqld /var/log/mysql
        chown -R mysql:mysql /var/run/mysqld /var/log/mysql 2>/dev/null || true
        nohup mysqld_safe --user=mysql >/var/log/mysql/mysqld_safe.log 2>&1 &
        # Wait up to 30s for the socket to become responsive
        for _ in $(seq 1 15); do
            sleep 2
            is_db_running && return 0
        done
    fi

    return 1
}

setup_database() {
    info "Starting MySQL / MariaDB…"
    detect_db_service

    if ! start_db_service; then
        die "Could not start ${DB_SERVICE}. Check 'journalctl -u ${DB_SERVICE}' or '/var/log/mysql/error.log'."
    fi
    success "${DB_SERVICE} is running."

    DB_USER="vpn_panel_user"
    DB_PASS=$(generate_password)
    DB_NAME="vpn_panel"

    info "Creating database and user…"
    mysql -u root <<SQL
CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\`;
CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';
GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'localhost';
FLUSH PRIVILEGES;
SQL
    success "Database '${DB_NAME}' ready."
}

# ── Application install ───────────────────────────────────────────────────────
install_app() {
    info "Creating system user '${SERVICE_USER}'…"
    id "$SERVICE_USER" &>/dev/null || useradd --system --shell /usr/sbin/nologin --home "$INSTALL_DIR" "$SERVICE_USER"

    if [[ -d "$INSTALL_DIR/.git" ]]; then
        info "Updating existing installation in ${INSTALL_DIR}…"
        git -C "$INSTALL_DIR" pull origin main
    else
        info "Cloning repository to ${INSTALL_DIR}…"
        rm -rf "$INSTALL_DIR"
        git clone "$REPO_URL" "$INSTALL_DIR"
    fi

    chown -R "$SERVICE_USER:$SERVICE_USER" "$INSTALL_DIR"

    info "Installing npm dependencies (this may take a few minutes)…"
    cd "$INSTALL_DIR"
    sudo -u "$SERVICE_USER" npm install --omit=dev --prefer-offline 2>&1 | tail -5
    success "Dependencies installed."
}

# ── Hash admin password with bcrypt ──────────────────────────────────────────
hash_password() {
    ADMIN_PASS_HASH=$(node -e "const b=require('bcryptjs'); process.stdout.write(b.hashSync('$ADMIN_PASS',12));")
}

# ── Write .env ────────────────────────────────────────────────────────────────
write_env() {
    JWT_SECRET=$(generate_secret)
    MIGRATION_TOKEN=$(generate_secret)

    if [[ -n "$DOMAIN" ]]; then
        ALLOWED_ORIGINS="https://${DOMAIN},http://localhost:${PANEL_PORT}"
    else
        ALLOWED_ORIGINS="http://localhost:${PANEL_PORT}"
    fi

    cat > "$INSTALL_DIR/.env" <<ENV
MYSQL_HOST=localhost
MYSQL_USER=${DB_USER}
MYSQL_PASSWORD=${DB_PASS}
MYSQL_DATABASE=${DB_NAME}
ADMIN_USERNAME=${ADMIN_USER}
ADMIN_PASSWORD_HASH=${ADMIN_PASS_HASH}
JWT_SECRET=${JWT_SECRET}
MIGRATION_TOKEN=${MIGRATION_TOKEN}
PORT=${PANEL_PORT}
NODE_ENV=production
ALLOWED_ORIGINS=${ALLOWED_ORIGINS}
ENV
    chmod 600 "$INSTALL_DIR/.env"
    chown "$SERVICE_USER:$SERVICE_USER" "$INSTALL_DIR/.env"
    success ".env written."
}

# ── Build Next.js ─────────────────────────────────────────────────────────────
build_app() {
    info "Building Next.js application (this takes a few minutes)…"
    cd "$INSTALL_DIR"
    sudo -u "$SERVICE_USER" npm run build 2>&1 | tail -10
    success "Build complete."
}

# ── Run schema ────────────────────────────────────────────────────────────────
run_schema() {
    info "Importing database schema…"
    mysql -u root "$DB_NAME" < "$INSTALL_DIR/schema.sql"
    success "Schema imported."
}

# ── Systemd service ───────────────────────────────────────────────────────────
install_service() {
    info "Installing systemd service…"
    mkdir -p "$INSTALL_DIR/logs"
    chown "$SERVICE_USER:$SERVICE_USER" "$INSTALL_DIR/logs"

    cat > "$SERVICE_FILE" <<UNIT
[Unit]
Description=Power VPN Management Panel
After=network.target mysql.service mariadb.service
Wants=mysql.service mariadb.service

[Service]
Type=simple
User=${SERVICE_USER}
Group=${SERVICE_USER}
WorkingDirectory=${INSTALL_DIR}
EnvironmentFile=${INSTALL_DIR}/.env
ExecStart=$(which node) node_modules/.bin/next start -p \${PORT:-${PANEL_PORT}}
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal
LimitNOFILE=65535
PrivateTmp=yes
NoNewPrivileges=yes

[Install]
WantedBy=multi-user.target
UNIT

    if command -v systemctl &>/dev/null && [[ -d /run/systemd/system ]]; then
        systemctl daemon-reload
        systemctl enable powervpn
        systemctl restart powervpn
        success "Service started via systemd."
    else
        warn "systemd not available; starting panel with nohup instead."
        warn "Unit file written to ${SERVICE_FILE} for later use."
        # shellcheck disable=SC1091
        set -a; . "${INSTALL_DIR}/.env"; set +a
        nohup sudo -u "$SERVICE_USER" -E \
            "$(which node)" "${INSTALL_DIR}/node_modules/.bin/next" start \
            -p "${PORT:-${PANEL_PORT}}" \
            >>"${INSTALL_DIR}/logs/panel.log" 2>&1 &
        sleep 2
        success "Panel started in background (logs: ${INSTALL_DIR}/logs/panel.log)."
    fi
}

# ── Nginx reverse proxy + Let's Encrypt ───────────────────────────────────────
reload_nginx() {
    if command -v systemctl &>/dev/null && [[ -d /run/systemd/system ]]; then
        systemctl enable --now nginx >/dev/null 2>&1 || true
        systemctl reload nginx 2>/dev/null || systemctl restart nginx
    elif command -v service &>/dev/null; then
        service nginx start 2>/dev/null || true
        service nginx reload 2>/dev/null || service nginx restart
    else
        nginx -s reload 2>/dev/null || nginx
    fi
}

setup_domain_ssl() {
    [[ -z "$DOMAIN" ]] && return 0

    info "Configuring nginx reverse proxy for ${DOMAIN}…"

    # DNS sanity check (best effort)
    SERVER_IP=$(curl -s --max-time 5 ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')
    DOMAIN_IP=$(getent hosts "$DOMAIN" | awk '{print $1}' | head -n1)
    if [[ -n "$DOMAIN_IP" && -n "$SERVER_IP" && "$DOMAIN_IP" != "$SERVER_IP" ]]; then
        warn "DNS for ${DOMAIN} resolves to ${DOMAIN_IP}, but server IP is ${SERVER_IP}."
        warn "Let's Encrypt may fail until you point an A record at ${SERVER_IP}."
    fi

    NGINX_VHOST="/etc/nginx/sites-available/powervpn.conf"
    cat > "$NGINX_VHOST" <<NGINX
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};

    client_max_body_size 25m;

    location / {
        proxy_pass http://127.0.0.1:${PANEL_PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 300s;
    }
}
NGINX

    ln -sf "$NGINX_VHOST" /etc/nginx/sites-enabled/powervpn.conf
    rm -f /etc/nginx/sites-enabled/default

    if ! nginx -t 2>/dev/null; then
        die "nginx config test failed. Inspect ${NGINX_VHOST}."
    fi
    reload_nginx
    success "nginx reverse proxy active on port 80 for ${DOMAIN}."

    info "Requesting Let's Encrypt certificate for ${DOMAIN}…"
    if certbot --nginx -d "$DOMAIN" -m "$LE_EMAIL" --agree-tos --redirect --non-interactive 2>&1 | tail -10; then
        success "HTTPS enabled — https://${DOMAIN}"
        PANEL_URL="https://${DOMAIN}"
    else
        warn "Certbot failed. The panel is still reachable at http://${DOMAIN} (port 80)."
        warn "Common causes: DNS not propagated, port 80 blocked, or rate-limit reached."
        warn "Re-run later with: certbot --nginx -d ${DOMAIN} -m ${LE_EMAIL} --agree-tos --redirect"
        PANEL_URL="http://${DOMAIN}"
    fi
}

# ── CLI management script ─────────────────────────────────────────────────────
install_cli() {
    cp "$INSTALL_DIR/powervpn.sh" /usr/local/bin/powervpn
    chmod +x /usr/local/bin/powervpn
    success "'powervpn' command installed. Run: powervpn"
}

# ── Save credentials ──────────────────────────────────────────────────────────
save_credentials() {
    if [[ -z "${PANEL_URL:-}" ]]; then
        PANEL_URL="http://$(curl -s --max-time 5 ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}'):${PANEL_PORT}"
    fi
    cat > "$CRED_FILE" <<CRED
====== Power VPN Panel Credentials ======
Panel URL:        ${PANEL_URL}
Admin Username:   ${ADMIN_USER}
Admin Password:   ${ADMIN_PASS}
Database User:    ${DB_USER}
Database Pass:    ${DB_PASS}
Database Name:    ${DB_NAME}
Migration Token:  ${MIGRATION_TOKEN}
==========================================
CRED
    chmod 600 "$CRED_FILE"
    chown root:root "$CRED_FILE"
}

# ── Firewall ──────────────────────────────────────────────────────────────────
configure_firewall() {
    command -v ufw &>/dev/null || return 0

    if [[ -n "$DOMAIN" ]]; then
        ufw allow 80/tcp  >/dev/null 2>&1 || true
        ufw allow 443/tcp >/dev/null 2>&1 || true
        # Panel port is reachable only via nginx → close it from the public
        ufw delete allow "$PANEL_PORT"/tcp >/dev/null 2>&1 || true
        info "Firewall: ports 80 + 443 opened, ${PANEL_PORT} kept private."
    else
        ufw allow "$PANEL_PORT"/tcp >/dev/null 2>&1 || true
        info "Firewall: port ${PANEL_PORT} opened."
    fi
}

# ── Final summary ─────────────────────────────────────────────────────────────
print_summary() {
    SERVER_IP=$(curl -s --max-time 5 ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')
    if [[ -z "${PANEL_URL:-}" ]]; then
        PANEL_URL="http://${SERVER_IP}:${PANEL_PORT}"
    fi
    INSTALL_OK=1
    echo
    echo -e "${GREEN}======================================================${NC}"
    echo -e "${GREEN}   Power VPN Panel installed SUCCESSFULLY${NC}"
    echo -e "${GREEN}======================================================${NC}"
    echo -e "  Panel URL:      ${CYAN}${PANEL_URL}${NC}"
    if [[ -n "${DOMAIN:-}" ]]; then
        echo -e "  Domain:         ${CYAN}${DOMAIN}${NC}"
    fi
    echo -e "  Server IP:      ${CYAN}${SERVER_IP}${NC}"
    echo -e "  Panel Port:     ${CYAN}${PANEL_PORT}${NC} (internal)"
    echo -e "  Username:       ${YELLOW}${ADMIN_USER}${NC}"
    echo -e "  Password:       ${YELLOW}${ADMIN_PASS}${NC}"
    echo -e "  Credentials:    ${CRED_FILE}"
    echo -e "  Manage panel:   ${CYAN}powervpn${NC}"
    echo -e "${GREEN}======================================================${NC}"
    if [[ -n "${DOMAIN:-}" ]]; then
        echo -e "${YELLOW}  Note: open ${PANEL_URL} (without :${PANEL_PORT}). The panel${NC}"
        echo -e "${YELLOW}        port is firewalled — nginx serves it on 80/443.${NC}"
    fi
    echo -e "${RED}  Keep credentials safe and delete ${CRED_FILE} after saving!${NC}"
    echo
}

# ── Main ──────────────────────────────────────────────────────────────────────
main() {
    require_root
    collect_credentials
    install_dependencies
    setup_database
    install_app
    hash_password
    write_env
    build_app
    run_schema
    install_service
    setup_domain_ssl
    install_cli
    configure_firewall
    save_credentials
    print_summary
}

main "$@"
