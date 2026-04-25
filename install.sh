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
}

# ── MySQL setup ───────────────────────────────────────────────────────────────
setup_database() {
    info "Starting MySQL / MariaDB…"
    systemctl enable --now mysql 2>/dev/null || systemctl enable --now mariadb

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
ALLOWED_ORIGINS=http://localhost:${PANEL_PORT}
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

    systemctl daemon-reload
    systemctl enable powervpn
    systemctl restart powervpn
    success "Service started."
}

# ── CLI management script ─────────────────────────────────────────────────────
install_cli() {
    cp "$INSTALL_DIR/powervpn.sh" /usr/local/bin/powervpn
    chmod +x /usr/local/bin/powervpn
    success "'powervpn' command installed. Run: powervpn"
}

# ── Save credentials ──────────────────────────────────────────────────────────
save_credentials() {
    cat > "$CRED_FILE" <<CRED
====== Power VPN Panel Credentials ======
Panel URL:        http://$(curl -s ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}'):${PANEL_PORT}
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
    if command -v ufw &>/dev/null; then
        ufw allow "$PANEL_PORT"/tcp >/dev/null 2>&1 || true
        info "Firewall: port ${PANEL_PORT} opened."
    fi
}

# ── Final summary ─────────────────────────────────────────────────────────────
print_summary() {
    SERVER_IP=$(curl -s --max-time 5 ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')
    echo
    echo -e "${GREEN}======================================================${NC}"
    echo -e "${GREEN}   Power VPN Panel installed successfully!${NC}"
    echo -e "${GREEN}======================================================${NC}"
    echo -e "  Panel URL:      ${CYAN}http://${SERVER_IP}:${PANEL_PORT}${NC}"
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
    install_cli
    configure_firewall
    save_credentials
    print_summary
}

main "$@"
