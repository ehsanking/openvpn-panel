#!/usr/bin/env bash
# Power VPN — local CLI for the panel admin

set -u

ENV_FILE=".env"
[[ -f "$ENV_FILE" ]] || touch "$ENV_FILE"

color_yellow=$'\e[1;33m'
color_cyan=$'\e[1;36m'
color_green=$'\e[1;32m'
color_red=$'\e[1;31m'
color_reset=$'\e[0m'

show_menu() {
    clear
    echo "${color_yellow}==========================================${color_reset}"
    echo "             ${color_cyan}⚡ Power VPN CLI${color_reset}             "
    echo "${color_yellow}==========================================${color_reset}"
    echo "${color_green}1)${color_reset} Change admin username"
    echo "${color_green}2)${color_reset} Change admin password (regenerates bcrypt hash)"
    echo "${color_green}3)${color_reset} Change panel port"
    echo "${color_green}4)${color_reset} Update packages and rebuild"
    echo "${color_green}5)${color_reset} Restart panel (systemd / pm2 / docker)"
    echo "${color_red}6)${color_reset} Wipe build artifacts (keeps panel.sqlite + .env)"
    echo "${color_yellow}0)${color_reset} Exit"
    echo "${color_yellow}==========================================${color_reset}"
    echo -n "Select an option: "
}

update_env() {
    local KEY=$1
    local VAL=$2
    if grep -q "^${KEY}=" "$ENV_FILE"; then
        # Use a sentinel so `/` and `&` in the value don't break the sed.
        local tmp
        tmp=$(mktemp)
        awk -v k="$KEY" -v v="$VAL" -F= '
            BEGIN { OFS="=" }
            $1 == k { print k, v; next }
            { print }
        ' "$ENV_FILE" > "$tmp" && mv "$tmp" "$ENV_FILE"
    else
        echo "${KEY}=${VAL}" >> "$ENV_FILE"
    fi
}

while true; do
    show_menu
    read -r option
    case $option in
        1)
            read -rp "New admin username: " new_user
            if [[ -n "$new_user" ]]; then
                update_env "ADMIN_USERNAME" "$new_user"
                echo "${color_green}Updated. Restart the panel to apply.${color_reset}"
            fi
            sleep 2
            ;;
        2)
            read -rsp "New admin password: " new_pass; echo
            if [[ -n "$new_pass" ]]; then
                if ! command -v node >/dev/null 2>&1; then
                    echo "${color_red}node not found in PATH.${color_reset}"; sleep 2; continue
                fi
                hash=$(node -e "process.stdout.write(require('bcryptjs').hashSync(process.argv[1], 12))" "$new_pass")
                update_env "ADMIN_PASSWORD_HASH" "$hash"
                # Drop legacy key if it exists.
                sed -i '/^ADMIN_PASSWORD=/d' "$ENV_FILE"
                echo "${color_green}Password hash updated. Restart the panel to apply.${color_reset}"
            fi
            sleep 2
            ;;
        3)
            read -rp "New panel port: " new_port
            if [[ "$new_port" =~ ^[0-9]+$ ]] && (( new_port > 0 && new_port < 65536 )); then
                update_env "PORT" "$new_port"
                echo "${color_green}Port updated. Restart the panel to apply.${color_reset}"
            else
                echo "${color_red}Invalid port.${color_reset}"
            fi
            sleep 2
            ;;
        4)
            echo "Updating packages…"
            npm install
            echo "Rebuilding…"
            npm run build
            echo "${color_green}Update complete. Restart the panel to apply.${color_reset}"
            read -rp "Press ENTER to continue."
            ;;
        5)
            if command -v systemctl >/dev/null 2>&1 && systemctl list-unit-files | grep -q '^powervpn'; then
                sudo systemctl restart powervpn
                echo "${color_green}systemctl restart powervpn${color_reset}"
            elif command -v docker >/dev/null 2>&1 && docker ps --format '{{.Names}}' | grep -q '^powervpn$'; then
                docker compose restart app
                echo "${color_green}docker compose restart app${color_reset}"
            elif command -v pm2 >/dev/null 2>&1 && pm2 list 2>/dev/null | grep -q powervpn; then
                pm2 restart powervpn
                echo "${color_green}pm2 restart powervpn${color_reset}"
            else
                echo "${color_red}No managed process found (systemd / docker / pm2). Restart manually.${color_reset}"
            fi
            sleep 2
            ;;
        6)
            echo "${color_red}This removes node_modules, .next, package-lock.json.${color_reset}"
            echo "${color_red}panel.sqlite, .env and .jwt_secret are KEPT.${color_reset}"
            read -rp "Type YES to confirm: " confirm
            if [[ "$confirm" == "YES" ]]; then
                rm -rf node_modules .next package-lock.json
                echo "${color_green}Cleaned.${color_reset}"
            else
                echo "Aborted."
            fi
            sleep 2
            ;;
        0)
            echo "Bye."
            break
            ;;
        *)
            echo "${color_red}Invalid option.${color_reset}"
            sleep 1
            ;;
    esac
done
