# Nafas AI — Internal AI Workspace

A self-hosted internal AI platform for teams. It gives employees access to multiple
LLM providers (Anthropic, OpenAI, Google, OpenRouter, or any OpenAI-compatible
endpoint) through a clean, role-based interface — with admin controls over users,
usage limits, access hours, roles, and tool access. Runs on any shared cPanel/PHP
hosting. No Docker or cloud infrastructure required.

---

## Features

**For employees**
- Chat with any configured model (Claude, GPT, Gemini, or any OpenRouter / custom model)
- Switch provider and model on the fly from the chat header
- Regenerate the last response
- Deep Research tool — AI synthesis of the model's knowledge (see note below)
- Code assistant and summarization tools
- Usage dashboard — see daily token / request / cost consumption

**For admins**
- Full user management (create, edit, disable, delete)
- Per-user daily limits: tokens, requests, cost
- Per-user access-hour restrictions (e.g. 8:00–20:00, selected weekdays)
- **Roles & Permissions** — editable default permission sets per role; applied to
  new users automatically
- **Tool Access** — enable/disable each tool and restrict it by role
- **Multi-provider AI configuration** — one API key per provider, with the ability
  to **add as many models as you like** per provider (e.g. any OpenRouter model id)
- Platform settings: system prompt, response tone, response length, creativity
  (temperature), max output tokens, and conversation retention
- **Usage analytics** — real request/usage charts derived from the database
- **System Logs** — structured server-side error log viewable in the admin panel
  (invaluable for diagnosing provider/connection issues on shared hosting)

**Security**
- Passwords hashed with bcrypt (PHP `password_hash`)
- API keys stored server-side only, encrypted at rest — never returned to the browser
- Signed session tokens (7-day expiry)
- `.htaccess` blocks direct access to `config.php` and the `data/` directory
- No sensitive data in the React bundle

> **Note on Deep Research:** the research tool synthesizes answers from the model's
> training knowledge. The source toggles (web / academic / news / internal) shape the
> prompt but do **not** fetch live internet results.

> **Not in this release:** image generation and file upload / document analysis are
> hidden until a backend provider is implemented.

---

## Tech Stack

| Layer     | Technology                                      |
|-----------|-------------------------------------------------|
| Frontend  | React 19, TypeScript, Vite 7, Tailwind CSS v4   |
| State     | Zustand 5 with `persist` middleware             |
| Build     | `vite-plugin-singlefile` → single `index.html`  |
| Backend   | PHP 8.x (single `api.php` file)                 |
| Storage   | MySQL (users, chats, config) + `data/` (logs, rate limits) |
| AI        | Anthropic, OpenAI, Google, OpenRouter, Custom   |
| Hosting   | Any shared cPanel hosting with PHP + cURL       |

---

## Deployment (Shared Hosting)

### Prerequisites

- PHP 8.0 or higher with the `curl` and `openssl` extensions enabled
- A shared hosting account (cPanel, DirectAdmin, etc.) with **outbound HTTPS access**
  to your AI provider (see Troubleshooting)
- A MySQL database
- Node.js 18+ on your local machine for building

### Step 1 — Build the frontend

```bash
npm install
npm run build
```

This produces a `dist/` directory. The React app compiles into a single `dist/index.html`.

### Step 2 — Create the MySQL database

1. Log into **cPanel → MySQL Databases**
2. Create a new database (e.g. `myuser_nafas`)
3. Create a database user and assign it to the database with **All Privileges**
4. Note the host (usually `localhost`), database name, username, and password

> Tables (`users`, `conversations`, `messages`, `app_config`) are created
> **automatically** on first request — no SQL import needed.

### Step 3 — Configure the server

```bash
cd public
cp config.example.php config.php
```

Open `config.php` and fill in your values:

```php
// You can configure keys here, or leave them blank and add them later in the
// Admin → Providers UI (where they are encrypted at rest).
define('ANTHROPIC_API_KEY', '');
define('OPENAI_API_KEY', '');
define('GOOGLE_API_KEY', '');
define('OPENROUTER_API_KEY', '');

define('JWT_SECRET', 'YOUR_64_CHAR_HEX_SECRET');   // see generation command below

define('DB_HOST', 'localhost');
define('DB_NAME', 'myuser_nafas');
define('DB_USER', 'myuser_nafas');
define('DB_PASS', 'your_db_password');

define('ADMIN_EMAIL',    'admin@yourcompany.com');
define('ADMIN_PASSWORD', 'YOUR_STRONG_PASSWORD');
define('ADMIN_NAME',     'Administrator');
```

**Generate a secure JWT secret:**
```bash
php -r "echo bin2hex(random_bytes(32));"
```

> **Never commit `config.php` to git.** It is listed in `.gitignore`.

### Step 4 — Upload to your hosting

Upload the contents of `dist/` plus the PHP backend to your public web directory
(e.g. `public_html/`):

```
public_html/
├── index.html          ← React app (compiled from dist/)
├── api.php             ← PHP backend
├── config.php          ← Your secrets (never commit this)
├── .htaccess           ← Security rules
└── data/               ← Created automatically (logs, rate limits)
    └── .htaccess        ← Deny-all
```

### Step 5 — First login

Navigate to your domain and log in with the credentials from `config.php`.
If `ADMIN_PASSWORD` was left as `YOUR_STRONG_PASSWORD`, a random password is
generated and written to the server's `error_log`, and you'll be forced to change
it on first login.

### Step 6 — Configure providers and models

1. Go to **Admin → Providers**
2. Enter the API key for a provider and click **Test** (the result and any error
   are also recorded in **Admin → System Logs**)
3. Add one or more models to that provider (e.g. an OpenRouter model id like
   `google/gemma-3-27b-it:free`), pick a default, then click **Save**
4. Choose the default provider for chat

---

## Adding / Managing Models

One API key per provider can power **many models**. In **Admin → Providers**, expand a
provider and use the **Models** section to add a model by its exact ID (and an optional
display name). Added models immediately appear in the Default Model selector and in the
chat model picker. Click **Save** to persist. Pricing defaults to "unknown" (zero) for
custom models; cost tracking applies only to models with known pricing.

---

## Default Admin Credentials

On first launch (empty `users` table), an admin account is created from the values in
`config.php`. If `ADMIN_PASSWORD` is `YOUR_STRONG_PASSWORD`, a random secure password
is generated and printed to the server's `error_log`, and a password change is forced
on first login.

After the admin account exists, changing values in `config.php` has no effect on the
stored account — change the password through the UI (or re-initialize by clearing the
`users` table).

### How to change the admin password

1. Log in as admin → `Admin → Users`
2. Click `⋯` next to the account → `Edit`
3. Enter a new password → `Save Changes`

Or, as any user, via **My Usage → Security → Change Password**.

---

## Backup Routine (Important)

All persistent state lives in **MySQL** (users, conversations, messages, config).
Run nightly backups. In cPanel, configure a cron job:

```bash
# Example backup cron script (run daily at 02:00)
mysqldump -u myuser_nafas -pyour_db_password myuser_nafas | gzip > ~/backups/db-$(date +\%F).sql.gz
find ~/backups -type f -mtime +7 -delete
```
*(Ensure `~/backups/` exists outside the `public_html` root.)*

The `data/` directory only holds the application log and rate-limit counters — useful
to keep but not critical.

---

## Troubleshooting

**A provider's Test fails with "Could not reach the provider".**
This means the *server* can't reach the provider (even if your browser can). Open
**Admin → System Logs** — the exact cURL error is recorded there:
- `SSL certificate problem...` → the host's CA bundle is outdated; ask your host to
  update it, or configure a CA bundle path in PHP.
- `Could not resolve host` / `Connection refused` / `timed out` → outbound network
  access is blocked; ask your host to allow outbound HTTPS to the provider's domain.

**Chat says "API key for provider X is not configured".**
Add and **Save** the key in Admin → Providers, and make sure the provider is enabled.

**A model returns "model not found".**
Double-check the exact model ID on the provider's model list (e.g. openrouter.ai/models).

---

## Environment Notes

- **All data** (accounts, conversations, messages, config) is stored in MySQL.
  Clearing the browser cache loses nothing — users simply log back in.
- **API key security.** Keys are stored encrypted server-side; the browser only ever
  receives a masked placeholder.
- **Session tokens** expire after 7 days.
- **Retention.** Conversations older than the configured retention period are pruned
  automatically (best-effort, on a small fraction of requests).

---

## Project Structure

```
├── src/
│   ├── components/
│   │   ├── admin/          # Overview, Users, Roles, Tool Access, Usage,
│   │   │                   #   Providers, System Logs, Settings
│   │   ├── chat/           # Chat interface
│   │   ├── tools/          # Deep research, tools list
│   │   └── user/           # Usage dashboard, change-password modal
│   ├── store/
│   │   ├── authStore.ts    # Auth state, login, theme
│   │   └── appStore.ts     # App state, conversations, providers, roles, tools
│   └── App.tsx
├── public/
│   ├── api.php             # PHP backend (auth, AI proxy, CRUD, config, logs, stats)
│   ├── config.example.php  # Config template
│   ├── .htaccess           # Security: blocks config.php and data/
│   └── data/.htaccess      # Deny all direct access
├── dist/                   # Built output — deploy this directory
└── vite.config.ts
```

---

## Security Checklist Before Going Live

- [ ] `config.php` is not committed to git (check `.gitignore`)
- [ ] `JWT_SECRET` is a unique 64-char random hex string
- [ ] Default admin password has been changed
- [ ] Provider API keys are valid and have appropriate rate limits set in their consoles
- [ ] `data/` is not web-accessible (verified by `.htaccess`)
- [ ] HTTPS is enabled on your hosting

---

## License

Internal use only. Not licensed for redistribution.
