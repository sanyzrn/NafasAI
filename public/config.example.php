<?php
// ══════════════════════════════════════════════════════════════════════════════
//  Nafas AI — Server Configuration
//
//  SETUP:
//  1. Copy this file:  cp config.example.php config.php
//  2. Fill in your values below
//  3. NEVER commit config.php to git — it contains secrets
// ══════════════════════════════════════════════════════════════════════════════

// ── API Keys ────────────────────────────────────────────────────────────────
// Configure the keys for the providers you want to support.
// You can leave keys blank if you don't intend to use that provider.
// Note: The custom API base URL can be configured dynamically in the Admin Panel.
define('ANTHROPIC_API_KEY', 'sk-ant-api03-YOUR_KEY_HERE');
define('OPENAI_API_KEY', '');
define('GOOGLE_API_KEY', '');
define('OPENROUTER_API_KEY', '');

// ── Session Token Secret ──────────────────────────────────────────────────────
// A random 64-character hex string used to sign login tokens.
// Generate one by running:  php -r "echo bin2hex(random_bytes(32));"
define('JWT_SECRET', 'REPLACE_WITH_64_CHAR_RANDOM_HEX_STRING');

// ── MySQL Database ────────────────────────────────────────────────────────────
// Create a database in cPanel → MySQL Databases, then fill in the credentials.
// Tables are created automatically on first run — no SQL import needed.
// If left empty, conversations will not be persisted (localStorage only).
define('DB_HOST', 'localhost');
define('DB_NAME', 'your_db_name');    // e.g. myuser_nucleus
define('DB_USER', 'your_db_user');    // e.g. myuser_nucleus
define('DB_PASS', 'your_db_password');

// ── Initial Admin Account ─────────────────────────────────────────────────────
// Created automatically on first launch (when data/users.json is empty).
// After first login, change your password via Admin → Users → Edit.
define('ADMIN_EMAIL',    'admin@yourcompany.com');
define('ADMIN_PASSWORD', 'YOUR_STRONG_PASSWORD');
define('ADMIN_NAME',     'Administrator');
