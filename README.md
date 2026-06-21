# Nucleus AI — Internal AI Workspace

A self-hosted internal AI platform for teams. Gives employees access to Claude (and other LLM providers) through a clean, role-based interface — with admin controls over users, usage limits, and access hours. Runs on any shared cPanel/PHP hosting. No Docker or cloud infrastructure required.

---

## Features

**For employees**
- Chat with Claude (and GPT-4, Gemini, or any OpenRouter model)
- Deep Research tool — AI-powered research synthesis
- Document analysis (file upload + AI Q&A)
- Code assistant
- Usage dashboard — see daily token/request/cost consumption

**For admins**
- Full user management (create, edit, disable, delete)
- Per-user daily limits: tokens, requests, cost
- Per-user access-hour restrictions (e.g. 8:00–20:00, weekdays only)
- Role-based permissions (employee / manager / admin)
- Multi-provider AI configuration (Anthropic, OpenAI, Google, OpenRouter, Custom)
- Platform settings (system prompt, model defaults, retention policy)
- Usage analytics overview

**Security**
- Passwords hashed with bcrypt (PHP `password_hash`)
- API keys stored server-side only — never sent to the browser
- JWT-style signed session tokens (7-day expiry)
- `.htaccess` blocks direct access to `config.php` and `data/`
- No sensitive data in the React bundle

---

## Tech Stack

| Layer     | Technology                                      |
|-----------|-------------------------------------------------|
| Frontend  | React 19, TypeScript, Vite 7, Tailwind CSS v4   |
| State     | Zustand 5 with `persist` middleware             |
| Build     | `vite-plugin-singlefile` → single `index.html`  |
| Backend   | PHP 8.x (single `api.php` file)                 |
| Storage   | `data/users.json` (accounts) + MySQL (chats)    |
| AI        | Anthropic, OpenAI, Google, OpenRouter, Custom   |
| Hosting   | Any shared cPanel hosting with PHP + cURL       |

---

## Deployment (Shared Hosting)

### Prerequisites

- PHP 8.0 or higher with `curl` extension enabled
- A shared hosting account (cPanel, DirectAdmin, etc.)
- Node.js 18+ on your local machine for building

### Step 1 — Build the frontend

```bash
npm install
npm run build
```

This produces a `dist/` directory. The React app compiles into a single `dist/index.html`.

### Step 2 — Create the MySQL database

1. Log into **cPanel → MySQL Databases**
2. Create a new database (e.g. `myuser_nucleus`)
3. Create a database user and assign it to the database with **All Privileges**
4. Note the host (usually `localhost`), database name, username, and password

> Tables (`conversations`, `messages`, `app_config`) are created **automatically** on first request — no SQL import needed.

### Step 3 — Configure the server

```bash
cd public
cp config.example.php config.php
```

Open `config.php` and fill in your values:

```php
define('ANTHROPIC_API_KEY', 'sk-ant-api03-...');   // Your Anthropic API key
define('JWT_SECRET', 'YOUR_64_CHAR_HEX_SECRET');   // See generation command below

define('DB_HOST', 'localhost');
define('DB_NAME', 'myuser_nucleus');                // Database name from Step 2
define('DB_USER', 'myuser_nucleus');                // Database user from Step 2
define('DB_PASS', 'your_db_password');

define('ADMIN_EMAIL',    'admin@yourcompany.com');  // First admin account
define('ADMIN_PASSWORD', 'YOUR_STRONG_PASSWORD');    // Set a strong initial password
define('ADMIN_NAME',     'Administrator');
```

**Generate a secure JWT secret:**
```bash
php -r "echo bin2hex(random_bytes(32));"
```

> **Never commit `config.php` to git.** It is listed in `.gitignore`.

### Step 4 — Upload to your hosting

Upload the contents of `dist/` to your public web directory (e.g. `public_html/`):

```
public_html/
├── index.html          ← React app (compiled)
├── api.php             ← PHP backend
├── config.php          ← Your secrets (never commit this)
├── config.example.php  ← Template (safe to commit)
├── .htaccess           ← Security rules
└── data/               ← Created automatically on first login
    └── users.json
```

### Step 5 — First login

Navigate to your domain. Log in with the credentials you set in `config.php`.

**Change the admin password immediately** after first login if you used a temporary one:  
`Admin → Users → click ⋯ next to your account → Edit → enter new password → Save`

> The `data/users.json` file is created automatically on first login. It stores all user accounts.

---

## Default Admin Credentials

On first launch (when `data/users.json` is empty), an admin account is created using the values defined in `config.php`.

If `ADMIN_PASSWORD` is set to `YOUR_STRONG_PASSWORD`, the server will automatically generate a random secure password and print it to the server's `error_log`. You will also be required to change this password upon your first login.

**These are set in `config.php` and only used on first launch**. After the admin account is created, changing values in `config.php` has no effect on the stored account — you must change the password through the UI or by deleting `data/users.json` to re-initialize.

### How to change the admin password

**Via the UI (recommended):**
1. Log in as admin
2. Go to `Admin → Users`
3. Click `⋯` next to your account → `Edit`
4. Enter a new password in the Password field
5. Click `Save Changes`

**Via config.php (only works before first launch):**
1. Delete `data/users.json` on the server
2. Update `ADMIN_PASSWORD` in `config.php`
3. Visit the site — the admin account will be re-created with the new password

---

## Backup Routine (Important)

Your complete data state is split into two places:
1. `data/users.json`: Holds all user accounts, passwords, and permissions. **Losing this locks everyone out.**
2. MySQL Database: Holds all chat histories.

You must run nightly backups for both. In cPanel, configure a cron job to backup both simultaneously:

```bash
# Example backup cron script (run daily at 02:00)
mysqldump -u myuser_nucleus -pyour_db_password myuser_nucleus | gzip > ~/backups/db-$(date +\%F).sql.gz
cp ~/public_html/data/users.json ~/backups/users-$(date +\%F).json
find ~/backups -type f -mtime +7 -delete
```
*(Ensure `~/backups/` directory exists outside the `public_html` root)*

---

## Adding Users

1. Log in as admin → `Admin → Users → Add User`
2. Fill in name, email, and a temporary password
3. Set role, permissions, and daily limits
4. Share the credentials with the employee
5. The employee should change their password after first login in the "My Usage" section.

---

## Environment Notes

- **User accounts** are stored in `data/users.json`. For 20 users this is entirely sufficient.
- **Conversations and messages** are stored in MySQL. Clearing the browser cache does not lose any data — users simply log in again and their full history is restored.
- **API key security.** API keys are stored securely server-side (either in `config.php` or encrypted in the database via the Admin UI). The browser never receives raw keys.
- **Session tokens** expire after 7 days. Users are logged out automatically.
- **Image generation** requires a separate provider. Configure one in `Admin → Providers` when ready.
- **MySQL tables** are auto-created on first request via `CREATE TABLE IF NOT EXISTS` — no manual SQL setup needed beyond creating the database in cPanel.

---

## Project Structure

```
├── src/
│   ├── components/
│   │   ├── admin/          # Admin panel views
│   │   ├── chat/           # Chat interface
│   │   ├── tools/          # Deep research, image gen, file analysis
│   │   └── user/           # Usage dashboard
│   ├── store/
│   │   ├── authStore.ts    # Auth state, login, theme
│   │   └── appStore.ts     # App state, conversations, AI config
│   └── App.tsx
├── public/
│   ├── api.php             # PHP backend (auth + AI proxy + user CRUD)
│   ├── config.example.php  # Config template
│   ├── .htaccess           # Security: blocks config.php and data/
│   └── data/.htaccess      # Security: deny all direct access
├── dist/                   # Built output — deploy this directory
└── vite.config.ts
```

---

## Security Checklist Before Going Live

- [ ] `config.php` is not committed to git (check `.gitignore`)
- [ ] `JWT_SECRET` is a unique 64-char random hex string
- [ ] Default admin password has been changed
- [ ] `ANTHROPIC_API_KEY` is a valid key with appropriate rate limits set in the Anthropic console
- [ ] `data/` directory is not web-accessible (verified by `.htaccess`)
- [ ] HTTPS is enabled on your hosting (required for secure cookie/token transport)

---

## License

Internal use only. Not licensed for redistribution.
