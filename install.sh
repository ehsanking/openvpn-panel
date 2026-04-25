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
    # `head` closes the pipe after reading 20 bytes which sends SIGPIPE to
    # `tr`; under `set -o pipefail` that becomes exit 141 and `set -e` would
    # abort the script. `|| true` neutralises the failed-pipe status while
    # the captured stdout (the password itself) is unaffected.
    LC_ALL=C tr -dc 'A-Za-z0-9!@#%^&*_+' < /dev/urandom 2>/dev/null | head -c 20 || true
}

generate_secret() {
    LC_ALL=C tr -dc 'A-Za-z0-9' < /dev/urandom 2>/dev/null | head -c 48 || true
}

# Find an unused TCP port for the internal Next.js backend.
find_free_port() {
    local port="${1:-3001}"
    while :; do
        if ! ss -tln 2>/dev/null | awk '{print $4}' | grep -qE "[:.]${port}$" \
           && [[ "$port" != "${PANEL_PORT:-}" ]]; then
            echo "$port"; return 0
        fi
        port=$((port + 1))
    done
}

# ── Collect admin credentials ─────────────────────────────────────────────────
# All prompts use `read -er` so readline handles backspace correctly and
# does not eat the prompt text when the user erases past column 0.
collect_credentials() {
    echo -e "\n${CYAN}====== Power VPN Panel Installer ======${NC}\n"

    while true; do
        read -erp "Enter Admin Username (min 5 chars): " ADMIN_USER
        [[ ${#ADMIN_USER} -ge 5 ]] && break
        warn "Username must be at least 5 characters."
    done

    # Password is shown while typing on purpose (user requested visibility).
    read -erp "Enter Admin Password (leave blank for random): " ADMIN_PASS
    if [[ -z "$ADMIN_PASS" ]]; then
        ADMIN_PASS=$(generate_password)
        echo -e "  Generated password: ${YELLOW}${ADMIN_PASS}${NC}"
    else
        echo -e "  Password set: ${YELLOW}${ADMIN_PASS}${NC}"
    fi

    read -erp "Enter Panel Port (default 3000): " PANEL_PORT
    PANEL_PORT=${PANEL_PORT:-3000}
    [[ "$PANEL_PORT" =~ ^[0-9]+$ ]] || PANEL_PORT=3000

    DOMAIN=""
    LE_EMAIL=""
    read -erp "Use a domain with HTTPS (Let's Encrypt)? [y/N]: " USE_DOMAIN
    if [[ "${USE_DOMAIN,,}" == "y" || "${USE_DOMAIN,,}" == "yes" ]]; then
        while true; do
            read -erp "Enter your domain (e.g. panel.example.com): " DOMAIN
            if [[ "$DOMAIN" =~ ^[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?(\.[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?)+$ ]]; then
                break
            fi
            warn "Invalid domain format. Try again."
        done
        while true; do
            read -erp "Enter email for Let's Encrypt notifications: " LE_EMAIL
            if [[ "$LE_EMAIL" =~ ^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$ ]]; then
                break
            fi
            warn "Invalid email. Try again."
        done
    fi

    # When a domain is set, nginx serves HTTPS on the user-chosen PANEL_PORT
    # and Next.js binds to a separate internal port (loopback only).
    if [[ -n "$DOMAIN" ]]; then
        BACKEND_PORT=$(find_free_port 3001)
        BIND_HOST="127.0.0.1"
    else
        BACKEND_PORT="$PANEL_PORT"
        BIND_HOST="0.0.0.0"
    fi
}

# ── System dependencies ───────────────────────────────────────────────────────
install_dependencies() {
    info "Updating package lists…"
    apt-get update -qq

    info "Installing system packages…"
    apt-get install -y -qq \
        curl git ca-certificates gnupg lsb-release iproute2 \
        mysql-server openssl ufw 2>/dev/null || \
    apt-get install -y -qq \
        curl git ca-certificates gnupg iproute2 \
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
        if [[ "$PANEL_PORT" == "443" ]]; then
            PUBLIC_URL="https://${DOMAIN}"
        else
            PUBLIC_URL="https://${DOMAIN}:${PANEL_PORT}"
        fi
        ALLOWED_ORIGINS="${PUBLIC_URL},http://localhost:${BACKEND_PORT}"
    else
        ALLOWED_ORIGINS="http://localhost:${BACKEND_PORT}"
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
PORT=${BACKEND_PORT}
HOSTNAME=${BIND_HOST}
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
    # Capture full build output so failures are diagnosable; only tail on
    # success to keep the log readable.
    local log="${INSTALL_DIR}/logs/build.log"
    mkdir -p "${INSTALL_DIR}/logs"
    if ! sudo -u "$SERVICE_USER" npm run build > "$log" 2>&1; then
        echo
        warn "npm run build failed — last 60 lines of ${log}:"
        tail -60 "$log" >&2
        die "Build failed. Full log: ${log}"
    fi
    tail -5 "$log"
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
ExecStart=$(which node) node_modules/.bin/next start -H ${BIND_HOST} -p ${BACKEND_PORT}
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
            -H "${BIND_HOST}" -p "${BACKEND_PORT}" \
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

write_nginx_vhost() {
    # $1 = "http-only" or "with-ssl"
    local mode="$1"
    local vhost="/etc/nginx/sites-available/powervpn.conf"
    local public_url_no_path
    if [[ "$PANEL_PORT" == "443" ]]; then
        public_url_no_path="https://\$host"
    else
        public_url_no_path="https://\$host:${PANEL_PORT}"
    fi

    {
        # Always serve port 80 — needed for ACME challenges and HTTP→HTTPS redirect.
        cat <<NGINX
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};

    location /.well-known/acme-challenge/ {
        root /var/www/letsencrypt;
        default_type "text/plain";
    }

NGINX
        if [[ "$mode" == "with-ssl" && "$PANEL_PORT" != "80" ]]; then
            cat <<NGINX
    location / {
        return 301 ${public_url_no_path}\$request_uri;
    }
}
NGINX
        else
            # No SSL yet (or PANEL_PORT==80) → proxy directly on 80.
            cat <<NGINX
    location / {
        proxy_pass http://127.0.0.1:${BACKEND_PORT};
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
        fi

        if [[ "$mode" == "with-ssl" && "$PANEL_PORT" != "80" ]]; then
            cat <<NGINX

server {
    listen ${PANEL_PORT} ssl http2;
    listen [::]:${PANEL_PORT} ssl http2;
    server_name ${DOMAIN};

    ssl_certificate     /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;
    ssl_session_cache   shared:SSL:10m;
    ssl_session_timeout 10m;

    client_max_body_size 25m;

    location / {
        proxy_pass http://127.0.0.1:${BACKEND_PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 300s;
    }
}
NGINX
        fi
    } > "$vhost"

    ln -sf "$vhost" /etc/nginx/sites-enabled/powervpn.conf
    rm -f /etc/nginx/sites-enabled/default

    if ! nginx -t 2>/dev/null; then
        nginx -t || true
        die "nginx config test failed. Inspect ${vhost}."
    fi
    reload_nginx
}

setup_domain_ssl() {
    [[ -z "$DOMAIN" ]] && return 0

    info "Configuring nginx for ${DOMAIN} on port ${PANEL_PORT}…"

    # DNS sanity check (best effort)
    SERVER_IP=$(curl -s --max-time 5 ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')
    DOMAIN_IP=$(getent hosts "$DOMAIN" | awk '{print $1}' | head -n1)
    if [[ -n "$DOMAIN_IP" && -n "$SERVER_IP" && "$DOMAIN_IP" != "$SERVER_IP" ]]; then
        warn "DNS for ${DOMAIN} resolves to ${DOMAIN_IP}, but server IP is ${SERVER_IP}."
        warn "Let's Encrypt may fail until you point an A record at ${SERVER_IP}."
    fi

    mkdir -p /var/www/letsencrypt
    chown -R www-data:www-data /var/www/letsencrypt 2>/dev/null || true

    # Step 1: HTTP-only vhost so certbot's HTTP-01 challenge can reach us.
    write_nginx_vhost http-only
    success "nginx serving on port 80 for ACME challenge."

    # Step 2: Obtain a certificate via webroot (does not touch nginx config).
    info "Requesting Let's Encrypt certificate for ${DOMAIN}…"
    local cert_ok=0
    if certbot certonly --webroot -w /var/www/letsencrypt \
            -d "$DOMAIN" -m "$LE_EMAIL" --agree-tos \
            --non-interactive --keep-until-expiring 2>&1 | tail -15; then
        if [[ -s "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]]; then
            cert_ok=1
        fi
    fi

    # Step 3: If we got a cert, switch nginx to SSL on the user's PANEL_PORT.
    if [[ "$cert_ok" -eq 1 ]]; then
        write_nginx_vhost with-ssl
        success "HTTPS enabled on port ${PANEL_PORT} for ${DOMAIN}."
        if [[ "$PANEL_PORT" == "443" ]]; then
            PANEL_URL="https://${DOMAIN}"
        else
            PANEL_URL="https://${DOMAIN}:${PANEL_PORT}"
        fi
    else
        warn "Certbot failed. Panel will be reachable at http://${DOMAIN} (port 80) only."
        warn "Common causes: DNS not propagated, port 80 blocked upstream, or LE rate-limit."
        warn "Retry: certbot certonly --webroot -w /var/www/letsencrypt -d ${DOMAIN} -m ${LE_EMAIL} --agree-tos"
        warn "Then re-run this installer or run: nginx -t && systemctl reload nginx"
        PANEL_URL="http://${DOMAIN}"
    fi
}

# ── Verify the panel is responding ────────────────────────────────────────────
verify_panel() {
    info "Verifying the panel is responding on 127.0.0.1:${BACKEND_PORT}…"
    local ok=0
    for _ in 1 2 3 4 5 6 7 8; do
        if curl -fsS --max-time 4 -o /dev/null "http://127.0.0.1:${BACKEND_PORT}/" 2>/dev/null; then
            ok=1; break
        fi
        sleep 3
    done
    if [[ "$ok" -eq 1 ]]; then
        success "Panel is responding."
    else
        warn "Panel did not respond after ~30s."
        warn "Check logs: journalctl -u powervpn -e   (or ${INSTALL_DIR}/logs/panel.log)"
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
        ufw allow 80/tcp >/dev/null 2>&1 || true                   # ACME + redirect
        ufw allow "${PANEL_PORT}"/tcp >/dev/null 2>&1 || true      # public HTTPS
        # Internal Next.js port stays loopback-only — no rule needed.
        info "Firewall: ports 80 and ${PANEL_PORT} opened (HTTPS on ${PANEL_PORT})."
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
    echo -e "  Public Port:    ${CYAN}${PANEL_PORT}${NC}"
    if [[ -n "${DOMAIN:-}" ]]; then
        echo -e "  Backend Port:   ${CYAN}${BACKEND_PORT}${NC} (loopback only)"
    fi
    echo -e "  Username:       ${YELLOW}${ADMIN_USER}${NC}"
    echo -e "  Password:       ${YELLOW}${ADMIN_PASS}${NC}"
    echo -e "  Credentials:    ${CRED_FILE}"
    echo -e "  Manage panel:   ${CYAN}powervpn${NC}"
    echo -e "${GREEN}======================================================${NC}"
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
    verify_panel
    print_summary
}

main "$@"
