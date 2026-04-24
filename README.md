<div align="center">
  <h1>⚡ Power VPN Manager</h1>
  <p><b>Enterprise-grade fleet management system for OpenVPN, WireGuard, Cisco AnyConnect, and L2TP/IPsec.</b></p>
  
  <p>
    <img src="https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js" alt="Next.js" />
    <img src="https://img.shields.io/badge/TypeScript-Ready-blue?style=flat-square&logo=typescript" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Tailwind-CSS-38B2AC?style=flat-square&logo=tailwind-css" alt="Tailwind CSS" />
    <img src="https://img.shields.io/badge/Database-PostgreSQL_|_SQLite-4169E1?style=flat-square&logo=postgresql" alt="PostgreSQL" />
    <img src="https://img.shields.io/badge/License-MIT-green.svg?style=flat-square" alt="License" />
  </p>
</div>

---

This project is a high-performance, modern Control Plane designed to manage dozens of VPN nodes, handle seamless certificate and key issuances, and provide a secure, real-time dashboard for administrators, resellers, and clients alike.

## ✨ Core Features & Enhancements

### 🚀 Modern Multi-Protocol Support
Full integration, provisioning, and management for all major VPN protocols from a single dashboard:
- **OpenVPN** (UDP/TCP)
- **Cisco AnyConnect** (Ocserv)
- **WireGuard** (wg1)
- **L2TP/IPsec**
- **Xray Core** (VLESS / VMess / Trojan) with auto-UUID generation & Quick Scan configs.

### 🔌 Multi-Tenancy Port Architecture
- Flexible **Port Management**: Dynamically assign ports during user provisioning.
- **Port Reuse**: Multiple users can share the same port simultaneously on identical protocols.
- **Conflict Prevention**: Built-in validation natively preventing protocol collisions (e.g., blocking OpenVPN and Wireguard sharing the same underlying port).

### 🔔 Beautiful UI & UX Real-time Feedback
- Integrated **SweetAlert2** for fluid, elegant, informative alerts for errors, port conflicts, and user operations.

### 🗄️ Database Scalability & Stability
- Added robust core support for **PostgreSQL** alongside SQLite/MySQL schemas.
- **Smart Migration Engine**: Instantly export/import configurations and users to safely migrate between node deployments without data loss.
- **Concurrency Fixes**: Upgraded architectural lock mechanisms (`DB_WRITE_LOCK`) to eliminate deadlocks and database corruption under high traffic loads.
- **Persistent Sessions**: Upgraded `SECRET_KEY` (JWT secret) storage for robust security preventing forced admin logouts after service restarts.

### 👥 Advanced User Management
- **Single & Bulk Provisioning**: Create standard or multiple users instantly using the bulk generation tool.
- **Granular Quotas**: Set specific data limits (GB), maximum simultaneous connections (per protocol), and flexible expiration dates.
- **Multi-Password Layers**: Define custom, unique passwords specific to L2TP and Cisco protocols for users along with global ones.
- **Live Monitoring & State**: View real-time uploaded/downloaded bandwidth and instantly toggle account access capabilities (activate/deactivate).

### 💼 Integrated Reseller (Sub-Admin) System
- Easily create and categorize accounts with `Reseller` roles.
- Allocate and strictly limit the max number of users they can create.
- Bind overall traffic/data quotas on a per-reseller basis.
- Sub-Admins get an isolated view to safely manage only their assigned users.

### 🌍 Multi-Node Fleet Management
- **Centralized Control**: Seamlessly orchestrate synchronization of users across multiple servers/nodes for all available protocols.
- **Node Health Tracking**: Track load scores and the online/offline status of interconnected nodes.
- **Protocol Discovery**: New nodes intelligently broadcast their supported protocol features allowing granular, conditional network routing.

### 📱 Responsive Client Portal
- **Subscriptions URL**: Every user features a unique login link to access their portal securely.
- **Smart QR Codes**: Instantly scan to connect configurations for mobile clients utilizing QR technology.
- **Quick Downloads**: Direct download links for `.ovpn` files and other required credentials.

---

## 🏗 Architecture & Stack 

- **Frontend**: Next.js 15 App Router, React Server Components, Tailwind CSS, styled by Lucide Icons & Framer Motion.
- **Backend / API**: Expressing RESTful structures inside Next.js API Routes, providing robust programmatic automation handling.
- **Security**: Double-hashed `bcrypt` password protection and robust JWT session cookies over HTTP-only strict endpoints.

---

## 🚀 Installation & Deployment

### ⚡ Automatic One-Line Installation (Recommended)
You can set up the entire Power VPN Manager, including SSL via Let's Encrypt with auto-renewal, missing dependencies, and initial configuration prompts by running a single command:

```bash
bash <(curl -Ls https://raw.githubusercontent.com/ehsanking/Power-VPN/main/install.sh)
```
*The interactive installer will ask for your domain, email, MySQL details, and Admin credentials. It will automatically issue the SSL certificate and deploy the panel securely.*

---

### Manual Setup (Development / Custom)
1. **Clone the repository**:
   ```bash
   git clone https://github.com/ehsanking/Power-VPN.git
   cd Power-VPN
   ```

2. **Database Schema Injection**:
   Configure `.env` with MySQL credentials, then build the tables:
   ```bash
   mysql -u root -p < schema.sql
   ```

3. **Run The Panel**:
   ```bash
   npm install
   npm run build
   npm start
   ```

*(For production environments, utilizing PM2, Docker, or Google Cloud Run is heavily recommended).*

---

## 🤝 Community & Support
- **Author**: EHSANKiNG ([@ehsanking](https://github.com/ehsanking))
- **Contributions**: Pull requests, feature requests, and bug finding strongly encouraged!
- **License**: MIT

---

## 💖 Support The Project
If you find this scalable architecture and real-time dashboard useful, consider keeping the project maintained by donating via Tether (USDT):

- **Network**: Tether (TRC20 / ERC20) 
- **Address**: `TKPswLQqd2e73UTGJ5prxVXBVo7MTsWedU`

---
*Optimized for privacy, security, and low-latency performance worldwide.*
