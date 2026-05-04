# Power VPN API

Every panel feature is reachable through this API. The dedicated mobile / desktop app
should consume these endpoints exclusively — the web panel calls the same routes.

## Conventions

- **Base URL**: the panel's origin (e.g. `https://panel.example.com`).
- **Content type**: every request and response is `application/json` unless noted.
- **Errors**: failed requests return
  `{ "error": { "code": "<MACHINE_CODE>", "message": "<human readable>", "details"?: ... } }`
  with an appropriate HTTP status (400 / 401 / 404 / 409 / 429 / 500).
- **CORS**: configure allowed app origins via the `ALLOWED_ORIGINS` env var
  (comma-separated, or `*`). The server already advertises
  `Authorization, Content-Type, X-Requested-With` on preflight.

## Authentication

Two auth flows. The panel website uses cookies; the dedicated app should use Bearer
tokens. Both reach the same endpoints.

### Admin login

```
POST /api/auth/session
Body: { "username": "<admin>", "password": "<plain>" }

200 OK
{
  "success": true,
  "token": "<JWT>",
  "tokenType": "Bearer",
  "expiresIn": 86400,
  "user": { "username": "<admin>", "role": "admin" }
}
```

The native app should store `token` securely (Keychain / Keystore) and send
`Authorization: Bearer <token>` on every subsequent request.

The web panel ignores the body and relies on the `vpn_session_jwt` HttpOnly
cookie that the server also sets.

### Inspect / refresh session

```
GET /api/auth/session
→ { "user": { "email": "...", "role": "admin" }, "isAdmin": true }
   or { "user": null, "isAdmin": false }
```

Accepts either the cookie or `Authorization: Bearer <jwt>`.

### Logout

```
DELETE /api/auth/session
```

Clears the cookies. Apps using Bearer tokens just discard the stored JWT.

### Rate limiting

`POST /api/auth/session` returns **429** after 5 failed attempts within 60 s
from the same IP.

---

## Inbounds (admin-only)

Inbounds are protocol gateways — one row per (protocol × server endpoint × port).
A user must be assigned to at least one inbound to receive a config.

### List

```
GET /api/inbounds
→ { "inbounds": [ Inbound, ... ] }
```

### Get one

```
GET /api/inbounds/<id>
→ { "data": Inbound }
```

### Create

```
POST /api/inbounds
Body (minimum):
{
  "name":           "EU-OpenVPN-Main",
  "protocol":       "openvpn",        // openvpn | wireguard | cisco | l2tp |
                                      // vless | vmess | trojan | shadowsocks
  "port":           1194,
  "server_address": "vpn.example.com" // IP or domain
}

201 Created
{ "success": true, "id": <number>, "message": "..." }
```

Protocol-specific fields are optional and namespaced (`ovpn_*`, `wg_*`,
`cisco_*`, `l2tp_*`, `xray_*`). The full list is in `lib/config-generators.ts`
and `schema.sql`.

Conflicts on `(protocol, port)` return **400**.

### Update

```
PATCH /api/inbounds/<id>
Body: any subset of editable fields (`name`, `port`, `server_address`,
       `remark`, `status`, `ovpn_*`, `wg_*`, `cisco_*`, `l2tp_*`, `xray_*`,
       `extra_config`).

→ { "data": Inbound, "message": "Inbound updated successfully" }
```

### Delete

```
DELETE /api/inbounds/<id>
→ { "success": true }
```

---

## Users (admin-only)

### List (paginated)

```
GET /api/users?page=1&limit=50&search=<substring>
→ {
    "data": [ User, ... ],
    "pagination": { "page", "limit", "total", "totalPages" }
  }
```

### Get one (with assigned inbounds)

```
GET /api/users/<id>
→ {
    "data": {
      ...User,
      "inbounds": [
        { "id", "name", "protocol", "port", "server_address", "status" }, ...
      ]
    }
  }
```

### Create

```
POST /api/users
Body:
{
  "username":         "alice",
  "password":         "...",            // optional, ≥ 6 chars
  "role":             "user",           // admin | user | reseller
  "status":           "active",         // active | inactive | disabled |
                                        //   suspended | revoked
  "traffic_limit_gb": 10,
  "max_connections":  1,
  "expires_at":       "2025-12-31T00:00:00Z",   // optional ISO-8601
  "inboundIds":       [1, 4, 7],                // recommended
  "cisco_password":   "...", "l2tp_password": "...",
  "wg_pubkey":        "...", "xray_uuid": "...",
  "port":             1194, "main_protocol": "openvpn"
}

201 Created
{ "data": { "id", "username", "role" } }
```

Returns **409 DUPLICATE_USER** if `username` already exists.

### Update (and re-assign inbounds)

```
PATCH /api/users/<id>
Body: any subset of the fields above plus `inboundIds`.
       Sending `inboundIds: [1,2]` REPLACES the user's assignments.

→ { "data": <User with inbounds>, "message": "User updated successfully" }
```

### Delete

```
DELETE /api/users/<id>
→ { "message": "User deleted successfully" }
```

---

## Settings (admin-only)

```
GET  /api/settings  → { panelName, publicIp, port, protocol, cipher, dnsServer, ... }
POST /api/settings  Body: { "panelName": "...", "publicIp": "...", ... }
                    → { "success": true }
```

Only these keys are persisted: `panelName`, `publicIp`, `port`, `protocol`,
`cipher`, `dnsServer`. Anything else in the body is ignored. PKI material
(`caCert`, `caPrivateKey`, `tlsAuthKey`) and JWT secret are intentionally
hidden from `GET`.

---

## End-user portal (public, token in URL)

These endpoints are how a customer's app fetches its configs. They do **not**
require admin auth — instead the path embeds a per-user token (currently
the `username` or `xray_uuid`).

### Subscription (multi-protocol)

```
GET /api/subscription/<token>
→ {
    "user":   { username, status, trafficUsed, trafficLimit, trafficLimitBytes,
                expiresAt, maxConnections },
    "configs": [
      { "protocol", "name", "type": "url"|"file"|"instructions",
        "url"?, "qrData"?, "server" }, ...
    ],
    "subscriptionUrl": "/api/subscription/<token>?format=base64"
  }
```

`format=base64` returns a base64-encoded list of subscription URLs that
v2rayNG / Shadowrocket / Clash etc. understand directly, plus
`Subscription-Userinfo` / `Profile-Title` / `Profile-Update-Interval`
headers.

### Single-config download

```
GET /api/client/download?username=<u>&inbound=<id>
GET /api/client/download?username=<u>&protocol=openvpn
```

Returns the raw config file (`.ovpn`, `.conf`) or a JSON payload with a
`url` / `qrData` / `instructions` block depending on the protocol.

The user must be assigned to that inbound — otherwise **404**.

### Client login (optional)

```
POST /api/client/login
Body: { "username": "...", "password": "..." }
→ { "success": true, "user": { ... } }
```

Sets a `client_token` HttpOnly cookie. Only needed when the user portal asks
for credentials; the subscription endpoint doesn't require it.

---

## Health

```
GET /api/health
→ { "status": "ok", "timestamp": "...", "services": { "database": "healthy" } }
```

Public, suitable for uptime probes.

---

## Quick start for the native app

1. **Login**
   `POST /api/auth/session` → store `token`.
2. **Persist** the token securely (Keychain / Keystore).
3. **Send** `Authorization: Bearer <token>` on every admin request.
4. **Refresh** by re-running step 1 before `expiresIn` elapses (24 h by default).
5. **CORS**: set `ALLOWED_ORIGINS` to your app origin if it runs inside a
   webview. Native apps without a browser context don't need CORS.
6. **End-user clients** of the VPN itself use `/api/subscription/<token>`
   directly — no admin token required.
