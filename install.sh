#!/bin/bash
# VPN Panel Installer - Secure Version

set -Eeuo pipefail

# Defect 44: No weak defaults. Enforce administrative input.
echo "--- VPN Panel Installation ---"

# Function to generate strong random password
generate_password() {
    LC_ALL=C tr -dc 'A-Za-z0-9!@#$%^&*()_+' < /dev/urandom | head -c 16
}

# Prompt for Admin Credentials
read -p "Enter Admin Username (min 5 chars): " ADMIN_USER
until [[ ${#ADMIN_USER} -ge 5 ]]; do
    read -p "Username too short. Try again: " ADMIN_USER
done

read -s -p "Enter Admin Password (leave blank for random): " ADMIN_PASS
echo
if [[ -z "$ADMIN_PASS" ]]; then
    ADMIN_PASS=$(generate_password)
    echo "Generated random password for you."
fi

# Define Database Credentials
DB_USER="vpn_panel_user"
DB_PASS=$(generate_password)
DB_NAME="vpn_panel"

# Defect 45: Store credentials in a secure file with restricted permissions
CRED_FILE="./.panel_credentials.txt"
cat <<EOF > "$CRED_FILE"
--- VPN Panel Credentials ---
Admin Username: $ADMIN_USER
Admin Password: $ADMIN_PASS
Database User:  $DB_USER
Database Pass:  $DB_PASS
Database Name:  $DB_NAME
EOF
chmod 600 "$CRED_FILE"

# Defect 43: Use a temporary defaults file for MySQL to avoid injection and credential exposure
CNF_FILE=$(mktemp)
cat <<EOF > "$CNF_FILE"
[client]
user=root
password=$MYSQL_ROOT_PASSWORD
EOF

# Database Setup
echo "Configuring database..."
# Use the defaults-extra-file for secure root access during install
mysql --defaults-extra-file="$CNF_FILE" <<EOF
CREATE DATABASE IF NOT EXISTS \`$DB_NAME\`;
CREATE USER IF NOT EXISTS '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASS';
GRANT ALL PRIVILEGES ON \`$DB_NAME\`.* TO '$DB_USER'@'localhost';
FLUSH PRIVILEGES;
EOF

rm -f "$CNF_FILE"

# Finalize Environmental Variables
cat <<EOF > .env
MYSQL_HOST=localhost
MYSQL_USER=$DB_USER
MYSQL_PASSWORD=$DB_PASS
MYSQL_DATABASE=$DB_NAME
ADMIN_USERNAME=$ADMIN_USER
ADMIN_PASSWORD=$ADMIN_PASS
EOF
chmod 600 .env

echo "----------------------------------------------------"
echo "Installation Success!"
echo "Credentials saved to: $CRED_FILE (Permissions: 600)"
echo "Please keep this file safe and remove it after usage."
echo "----------------------------------------------------"
