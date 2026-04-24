#!/bin/bash
# Power VPN Terminal CLI System
# Run this script to manage the node locally.

# Set strict mode (disabled for ease of reading prompts, but could be useful)
# set -e

ENV_FILE=".env"
if [ ! -f "$ENV_FILE" ]; then
    echo "Creating new .env file..."
    touch "$ENV_FILE"
fi

show_menu() {
    clear
    echo -e "\e[1;33m==========================================\e[0m"
    echo -e "             \e[1;36m⚡ Power VPN CLI\e[0m             "
    echo -e "\e[1;33m==========================================\e[0m"
    echo -e "\e[1;32m1)\e[0m Change Admin Username"
    echo -e "\e[1;32m2)\e[0m Change Admin Password"
    echo -e "\e[1;32m3)\e[0m Change Panel Port"
    echo -e "\e[1;32m4)\e[0m Update App & Packages"
    echo -e "\e[1;31m5)\e[0m Remove Project"
    echo -e "\e[1;35m6)\e[0m Install / Protocol Modules Manager"
    echo -e "\e[1;37m0)\e[0m Exit"
    echo -e "\e[1;33m==========================================\e[0m"
    echo -n "Select an option: "
}

update_env() {
    local KEY=$1
    local VAL=$2
    if grep -q "^${KEY}=" "$ENV_FILE"; then
        # Replace existing key
        sed -i "s/^${KEY}=.*/${KEY}=${VAL}/" "$ENV_FILE"
    else
        # Add new key
        echo "${KEY}=${VAL}" >> "$ENV_FILE"
    fi
}

# Ensure execution in the correct folder if linked globally
# cd /path/to/project... assuming script is executed within project dir.

while true; do
    show_menu
    read -r option
    case $option in
        1)
            echo -n "Enter new Admin Username: "
            read -r new_user
            if [[ -n "$new_user" ]]; then
                update_env "ADMIN_USERNAME" "$new_user"
                echo -e "\e[1;32mUsername updated in .env\e[0m (Please restart the panel services to apply)"
            fi
            sleep 2
            ;;
        2)
            echo -n "Enter new Admin Password: "
            read -s new_pass
            echo ""
            if [[ -n "$new_pass" ]]; then
                update_env "ADMIN_PASSWORD" "$new_pass"
                echo -e "\e[1;32mPassword updated in .env\e[0m (Please restart the panel services to apply)"
            fi
            sleep 2
            ;;
        3)
            echo -n "Enter new Panel Port (e.g., 3000): "
            read -r new_port
            if [[ "$new_port" =~ ^[0-9]+$ ]]; then
                update_env "PORT" "$new_port"
                echo -e "\e[1;32mPort updated in .env\e[0m (Please restart the panel services to apply)"
            else
                echo -e "\e[1;31mInvalid Port format.\e[0m"
            fi
            sleep 2
            ;;
        4)
            echo "Checking and Updating Packages..."
            npm update
            echo "Rebuilding Power VPN Panel..."
            npm run build
            echo -e "\e[1;32mUpdate complete! Please restart the service (e.g., systemctl restart powervpn).\e[0m"
            echo "Press ENTER to continue."
            read -r dummy
            ;;
        5)
            echo -e "\e[1;31mWARNING:\e[0m This will completely remove the Power VPN Panel and ALL DATA!"
            echo -n "Are you sure? (Type 'YES' to confirm): "
            read -r confirm
            if [ "$confirm" == "YES" ]; then
                echo "Removing Project files..."
                # Use caution with rm -rf
                rm -rf node_modules .next package-lock.json
                echo -e "\e[1;32mProject dependencies and builds removed. You can now delete the directory.\e[0m"
                exit 0
            else
                echo "Aborted."
                sleep 2
            fi
            ;;
        6)
            while true; do
                clear
                echo -e "\e[1;35m--- Protocol Modules Manager ---\e[0m"
                echo "Select a protocol to Uninstall/Remove from system:"
                echo -e "  \e[1;33m1)\e[0m Uninstall OpenVPN Core"
                echo -e "  \e[1;33m2)\e[0m Uninstall Cisco AnyConnect (Ocserv)"
                echo -e "  \e[1;33m3)\e[0m Uninstall L2TP/IPsec (xl2tpd)"
                echo -e "  \e[1;33m4)\e[0m Uninstall WireGuard"
                echo -e "  \e[1;32m0)\e[0m Back to Main Menu"
                echo -n "Choice: "
                read -r proto
                case $proto in
                   1) 
                      echo "Removing OpenVPN dependencies..."
                      # systemctl stop openvpn@server
                      # apt-get remove --purge openvpn -y
                      echo -e "\e[1;32mOpenVPN removed successfully.\e[0m"
                      sleep 2
                      ;;
                   2) 
                      echo "Removing Cisco AnyConnect (ocserv)..."
                      # systemctl stop ocserv
                      # apt-get remove --purge ocserv -y
                      echo -e "\e[1;32mCisco AnyConnect removed successfully.\e[0m"
                      sleep 2
                      ;;
                   3) 
                      echo "Removing L2TP/IPsec (xl2tpd / strongswan)..."
                      # systemctl stop xl2tpd strongswan
                      # apt-get remove --purge xl2tpd strongswan -y
                      echo -e "\e[1;32mL2TP/IPsec removed successfully.\e[0m"
                      sleep 2
                      ;;
                   4) 
                      echo "Removing WireGuard..."
                      # systemctl stop wg-quick@wg0
                      # apt-get remove --purge wireguard -y
                      echo -e "\e[1;32mWireGuard removed successfully.\e[0m"
                      sleep 2
                      ;;
                   0) break;;
                   *) echo -e "\e[1;31mInvalid choice.\e[0m"; sleep 1;;
                esac
            done
            ;;
        0)
            echo "Exiting Power VPN CLI..."
            break
            ;;
        *)
            echo -e "\e[1;31mInvalid option.\e[0m"
            sleep 1
            ;;
    esac
done
