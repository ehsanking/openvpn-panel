<div align="center">
  <h1>⚡ Power VPN Manager</h1>
  <p><b>Multi-protocol VPN control plane: OpenVPN, WireGuard, Cisco AnyConnect, L2TP/IPsec, VLESS, VMess, Trojan, Shadowsocks.</b></p>

  <p>
    <img src="https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js" alt="Next.js" />
    <img src="https://img.shields.io/badge/TypeScript-Ready-blue?style=flat-square&logo=typescript" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Database-SQLite-003B57?style=flat-square&logo=sqlite" alt="SQLite" />
    <img src="https://img.shields.io/badge/License-MIT-green.svg?style=flat-square" alt="License" />
  </p>
</div>

---

Power VPN is an **API-first** control plane for managing inbounds (per-protocol gateways) and the users who consume them. The web panel and the planned dedicated mobile/desktop app both speak the same REST surface — see [`API.md`](./API.md) for the full spec.

## ✨ Features

- **8 protocols** out of the box: OpenVPN (UDP/TCP), WireGuard, Cisco AnyConnect (ocserv), L2TP/IPsec, and the Xray family — VLESS, VMess, Trojan, Shadowsocks.
- **Strict port hygiene** — every TCP/UDP port belongs to exactly one inbound (enforced by API check + DB unique index). No accidental cross-protocol clashes.
- **Per-user inbound assignments**: a user must be attached to one or more inbounds; the subscription URL emits a config for each one.
- **Per-protocol validation**: each protocol's required fields (WireGuard server pubkey, L2TP PSK, Xray UUID, Shadowsocks cipher, etc.) are enforced by Zod before anything reaches the DB.
- **Bearer-token auth** for the dedicated app, plus HttpOnly cookies for the web panel — same endpoints, two credentials styles.
- **Embedded SQLite** — no external DB to operate. Self-healing column migrations keep older deployments aligned with the latest schema.
- **Subscription portal** at `/subscription/<username>` with QR codes and copy-link buttons for every assigned inbound.

## 🗺️ Project layout

```text
app/
  api/                 REST endpoints (admin + client)
  page.tsx             admin shell (Inbounds / Users / Settings)
  client/page.tsx      lightweight customer portal
  subscription/[token] per-user QR + config viewer
components/            React UI
lib/
  db.ts                SQLite pool + idempotent column migrations
  auth-utils.ts        JWT helpers + requireAdmin guard (cookie OR Bearer)
  inbound-validation.ts  per-protocol Zod schemas
  config-generators.ts   per-protocol client-config builders
  pki-service.ts       OpenVPN CA + per-user client certs
schema.sql             canonical DDL (re-applied on every boot via IF NOT EXISTS)
```

## 🚀 Installation

### Quick start (bare metal)

```bash
git clone https://github.com/ehsanking/Power-VPN.git
cd Power-VPN
bash install.sh        # interactive: asks for admin user/password & CORS origin
npm start              # listens on PORT (default 3000)
```

`install.sh` will:

1. Verify Node.js ≥ 18 is installed.
2. Hash the admin password with bcrypt (cost 12).
3. Generate a 32-byte JWT secret.
4. Write `.env` (mode `0600`) and `.panel_credentials.txt` (read once, then delete).
5. Run `npm ci && npm run build`.

The SQLite database (`panel.sqlite`) is created on the first request — there is no separate DB step.

### Docker

```bash
cp .env.example .env   # fill in ADMIN_USERNAME, ADMIN_PASSWORD_HASH, JWT_SECRET, ALLOWED_ORIGINS
docker compose up -d   # builds the image, mounts a `panel-data` volume for state
```

The Compose file mounts the SQLite file and the JWT secret under a named volume (`panel-data:/data`), so rebuilding the container does not wipe state.

## 🔐 Authentication & API

- Admin login: `POST /api/auth/session` → returns `{ token, expiresIn, ... }` and sets the `vpn_session_jwt` cookie.
- All admin endpoints accept either the cookie or `Authorization: Bearer <jwt>`.
- End-user clients fetch their config bundle from `GET /api/subscription/<token>` (no admin auth required).

The full surface — including request/response shapes, error codes, and CORS notes for the dedicated app — lives in [`API.md`](./API.md).

## 🧰 Day-to-day CLI

```bash
bash powervpn.sh
```

Lets you change the admin username/password, switch the panel port, run `npm install + build`, and restart the panel under systemd / docker compose / pm2 (whichever it detects).

## 🤝 License

MIT. Pull requests welcome — please target the existing test (`npm test`) and lint (`npm run lint`) suites.
