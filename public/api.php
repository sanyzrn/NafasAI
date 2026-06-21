<?php
/**
 * Nafas AI — API Backend
 * Handles authentication, Anthropic AI proxy, user management, and conversation persistence.
 */

// ── Bootstrap ────────────────────────────────────────────────────────────────
if (!file_exists(__DIR__ . '/config.php')) {
    http_response_code(503);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Server not configured. Create config.php from config.example.php.']);
    exit;
}
require_once __DIR__ . '/config.php';

if (!defined('JWT_SECRET') || strlen(JWT_SECRET) < 32 || str_contains(JWT_SECRET, 'REPLACE_WITH')) {
    respond(503, ['error' => 'Server misconfigured: set a strong JWT_SECRET.']);
}

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: SAMEORIGIN');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    exit;
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(405, ['error' => 'Method not allowed.']);
}

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin) {
    $expected = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https://' : 'http://') . ($_SERVER['HTTP_HOST'] ?? '');
    if ($origin !== $expected) {
        respond(403, ['error' => 'Cross-origin requests are not allowed.']);
    }
}

$DATA_DIR  = __DIR__ . '/data/';
$DATA_FILE = $DATA_DIR . 'users.json';

initData($DATA_FILE, $DATA_DIR);

$body   = json_decode(file_get_contents('php://input'), true) ?? [];
$action = $body['action'] ?? '';

// ── Auth middleware ───────────────────────────────────────────────────────────
$currentAuth = null;
$currentUser = null;

if ($action !== 'login') {
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    $token  = str_starts_with($header, 'Bearer ') ? substr($header, 7) : null;
    if (!$token || !($currentAuth = verifyToken($token))) {
        respond(401, ['error' => 'Unauthorized.']);
    }
    
    // Validate user still exists and is active, and load live permissions and limits
    $allUsers = loadUsers();
    $found = false;
    foreach ($allUsers as $u) {
        if ($u['id'] === $currentAuth['id']) {
            $currentUser = $u;
            $found = true;
            break;
        }
    }
    
    if (!$found || !($currentUser['isActive'] ?? true)) {
        respond(401, ['error' => 'Account disabled or removed.']);
    }
    $currentAuth['permissions'] = $currentUser['permissions'] ?? [];
    $currentAuth['role'] = $currentUser['role'] ?? 'user';
}

// ── Router ───────────────────────────────────────────────────────────────────
switch ($action) {
    case 'login':
        handleLogin($body);
        break;
    case 'chat':
        handleChat($body);
        break;
    case 'users.list':
        requireAdmin(); handleUsersList();
        break;
    case 'users.save':
        requireAdmin(); handleUserSave($body);
        break;
    case 'users.delete':
        requireAdmin(); handleUserDelete($body);
        break;
    case 'users.changePassword':
        handleChangePassword($body);
        break;
    case 'conversations.list':
        handleConversationsList();
        break;
    case 'messages.list':
        handleMessagesList($body);
        break;
    case 'conversation.delete':
        handleConversationDelete($body);
        break;
    case 'conversation.rename':
        handleConversationRename($body);
        break;
    case 'config.get':
        handleConfigGet();
        break;
    case 'config.save':
        requireAdmin(); handleConfigSave($body);
        break;
    case 'providers.test':
        requireAdmin(); handleProvidersTest($body);
        break;
    default:
        respond(404, ['error' => 'Unknown action.']);
}

// ── Database ──────────────────────────────────────────────────────────────────
function getDB(): PDO {
    if (!defined('DB_HOST') || !DB_HOST || !defined('DB_NAME') || !DB_NAME) {
        respond(500, ['error' => 'MySQL DB is required for user storage. Configure DB_HOST system variables.']);
    }
    static $pdo = null;
    if ($pdo !== null) return $pdo;
    try {
        $pdo = new PDO(
            'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4',
            DB_USER,
            DB_PASS,
            [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ]
        );
        global $DATA_DIR;
        if (!file_exists($DATA_DIR . '.db_init')) {
            initTables($pdo);
            @file_put_contents($DATA_DIR . '.db_init', '1');
        }
    } catch (\Throwable $e) {
        error_log('[Nafas AI] DB connection failed: ' . $e->getMessage());
        respond(500, ['error' => 'Database connection failed.']);
    }
    return $pdo;
}

function initTables(PDO $db): void {
    $db->exec("CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        passwordHash VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL,
        department VARCHAR(255),
        isActive BOOLEAN DEFAULT TRUE,
        mustChangePassword BOOLEAN DEFAULT FALSE,
        permissions JSON,
        usageLimit INT DEFAULT -1,
        usageCount INT DEFAULT 0,
        dailyTokenLimit INT DEFAULT -1,
        tokensUsed INT DEFAULT 0,
        dailyRequestLimit INT DEFAULT -1,
        requestsUsed INT DEFAULT 0,
        dailyCostLimit DECIMAL(10,4) DEFAULT -1,
        costUsed DECIMAL(10,4) DEFAULT 0,
        timeRestriction JSON,
        createdAt VARCHAR(50),
        lastLogin VARCHAR(50),
        lastUsageDate VARCHAR(50)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $db->exec("CREATE TABLE IF NOT EXISTS conversations (
        id           VARCHAR(36)  NOT NULL,
        user_id      VARCHAR(36)  NOT NULL,
        title        VARCHAR(500) NOT NULL DEFAULT 'New conversation',
        tool         VARCHAR(50)  NOT NULL DEFAULT 'chat',
        created_at   DATETIME     NOT NULL,
        updated_at   DATETIME     NOT NULL,
        PRIMARY KEY (id),
        INDEX idx_user_updated (user_id, updated_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $db->exec("CREATE TABLE IF NOT EXISTS messages (
        id              VARCHAR(36)  NOT NULL,
        conversation_id VARCHAR(36)  NOT NULL,
        role            VARCHAR(20)  NOT NULL,
        content         MEDIUMTEXT   NOT NULL,
        tokens          INT UNSIGNED NOT NULL DEFAULT 0,
        created_at      DATETIME     NOT NULL,
        PRIMARY KEY (id),
        INDEX idx_conv_created (conversation_id, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $db->exec("CREATE TABLE IF NOT EXISTS app_config (
        `key`      VARCHAR(100) NOT NULL,
        `value`    MEDIUMTEXT   NOT NULL,
        updated_at DATETIME     NOT NULL,
        PRIMARY KEY (`key`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
}

// ── Auth helpers ──────────────────────────────────────────────────────────────
function requireAdmin(): void {
    global $currentAuth;
    $perms = $currentAuth['permissions'] ?? [];
    if ($currentAuth['role'] !== 'admin' && !in_array('admin_panel', $perms)) {
        respond(403, ['error' => 'Admin access required.']);
    }
}

function writeAuditLog(string $action, string $target): void {
    global $currentAuth, $DATA_DIR;
    $logFile = $DATA_DIR . 'audit.log';
    $actor = $currentAuth['id'] ?? 'system';
    $timestamp = date('c');
    $line = sprintf("[%s] Actor: %s | Action: %s | Target: %s\n", $timestamp, $actor, $action, $target);
    $fp = @fopen($logFile, 'a');
    if ($fp) {
        if (flock($fp, LOCK_EX)) {
            fwrite($fp, $line);
            flock($fp, LOCK_UN);
        }
        fclose($fp);
    }
}

function encryptKey(string $key): string {
    if ($key === '') return '';
    $ivLen  = openssl_cipher_iv_length('aes-256-cbc');
    $iv     = openssl_random_pseudo_bytes($ivLen);
    $cipher = openssl_encrypt($key, 'aes-256-cbc', substr(hash('sha256', JWT_SECRET), 0, 32), OPENSSL_RAW_DATA, $iv);
    if ($cipher === false) return '';
    // Prepend the raw IV and base64 the whole blob. No text delimiter is used, so a
    // random IV byte can never collide with a separator and corrupt the payload.
    return 'v2:' . base64_encode($iv . $cipher);
}

function decryptKey(string $payload): string {
    if ($payload === '') return '';
    $secret = substr(hash('sha256', JWT_SECRET), 0, 32);
    $ivLen  = openssl_cipher_iv_length('aes-256-cbc');

    // Current format: "v2:" . base64(iv . rawCipher)
    if (strncmp($payload, 'v2:', 3) === 0) {
        $raw = base64_decode(substr($payload, 3), true);
        if ($raw === false || strlen($raw) <= $ivLen) return '';
        $iv     = substr($raw, 0, $ivLen);
        $cipher = substr($raw, $ivLen);
        $out    = openssl_decrypt($cipher, 'aes-256-cbc', $secret, OPENSSL_RAW_DATA, $iv);
        return $out === false ? '' : $out;
    }

    // Legacy format: base64(iv . '::' . base64Cipher) — read-only for migration.
    $decoded = base64_decode($payload, true);
    if ($decoded !== false && strpos($decoded, '::') !== false) {
        [$iv, $encrypted] = explode('::', $decoded, 2);
        if (strlen($iv) === $ivLen) {
            $out = @openssl_decrypt($encrypted, 'aes-256-cbc', $secret, 0, $iv);
            if ($out !== false) return $out;
        }
    }

    // Clear-text fallback (keys stored before encryption was introduced).
    return $payload;
}

function createToken(string $id, string $role, array $permissions): string {
    $payload = base64_encode(json_encode([
        'id'          => $id,
        'role'        => $role,
        'permissions' => $permissions,
        'exp'         => time() + 604800, // 7 days matching docs
    ]));
    $sig = hash_hmac('sha256', $payload, JWT_SECRET);
    return $payload . '.' . $sig;
}

function verifyToken(string $token): ?array {
    $parts = explode('.', $token, 2);
    if (count($parts) !== 2) return null;
    [$payload, $sig] = $parts;
    if (!hash_equals(hash_hmac('sha256', $payload, JWT_SECRET), $sig)) return null;
    $data = json_decode(base64_decode($payload), true);
    if (!$data || ($data['exp'] ?? 0) < time()) return null;
    return $data;
}

// ── Rate limiting ─────────────────────────────────────────────────────────────
function checkLoginRateLimit(string $dataDir): void {
    $ip   = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    $key  = hash('sha256', $ip); // hash to avoid storing raw IPs
    $file = $dataDir . 'rate_limits.json';
    $now  = time();

    $limits = [];
    if (file_exists($file)) {
        $raw = @file_get_contents($file);
        if ($raw) $limits = json_decode($raw, true) ?? [];
    }

    $entry = $limits[$key] ?? ['count' => 0, 'window_start' => $now, 'blocked_until' => 0];

    if (($entry['blocked_until'] ?? 0) > $now) {
        $wait = (int) ceil(($entry['blocked_until'] - $now) / 60);
        respond(429, ['error' => "Too many login attempts. Please wait {$wait} minute(s) before trying again."]);
    }

    // Reset window after 15 minutes
    if ($now - ($entry['window_start'] ?? 0) > 900) {
        $entry = ['count' => 0, 'window_start' => $now, 'blocked_until' => 0];
    }

    $entry['count'] = ($entry['count'] ?? 0) + 1;

    // Lock out for 30 minutes after 10 attempts in one window
    if ($entry['count'] > 10) {
        $entry['blocked_until'] = $now + 1800;
    }

    $limits[$key] = $entry;

    // Prune entries inactive for more than an hour
    $cutoff = $now - 3600;
    foreach ($limits as $k => $e) {
        if (max($e['window_start'] ?? 0, $e['blocked_until'] ?? 0) < $cutoff) unset($limits[$k]);
    }

    $fp = fopen($file, 'c');
    if ($fp) {
        if (flock($fp, LOCK_EX)) {
            ftruncate($fp, 0);
            rewind($fp);
            fwrite($fp, json_encode($limits));
            fflush($fp);
            flock($fp, LOCK_UN);
        }
        fclose($fp);
    }
}

function clearLoginRateLimit(string $dataDir): void {
    $ip   = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    $key  = hash('sha256', $ip);
    $file = $dataDir . 'rate_limits.json';
    if (!file_exists($file)) return;

    $fp = fopen($file, 'c+');
    if (!$fp) return;
    if (flock($fp, LOCK_EX)) {
        $limits = json_decode(stream_get_contents($fp), true) ?? [];
        unset($limits[$key]);
        ftruncate($fp, 0);
        rewind($fp);
        fwrite($fp, json_encode($limits));
        fflush($fp);
        flock($fp, LOCK_UN);
    }
    fclose($fp);
}

// ── Auth handler ──────────────────────────────────────────────────────────────
function handleLogin(array $body): void {
    global $DATA_DIR;
    checkLoginRateLimit($DATA_DIR);

    $email    = strtolower(trim($body['email'] ?? ''));
    $password = $body['password'] ?? '';
    if (!$email || !$password) respond(400, ['error' => 'Email and password are required.']);

    $users = loadUsers();
    $user  = null;
    foreach ($users as $u) {
        if (strtolower($u['email'] ?? '') === $email) { $user = $u; break; }
    }

    $dummyHash = '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';
    $hash = $user ? ($user['passwordHash'] ?? '') : $dummyHash;
    $valid = password_verify($password, $hash);

    if (!$user || !$valid) {
        respond(401, ['error' => 'Invalid email or password.']);
    }
    if (empty($user['isActive'])) {
        respond(403, ['error' => 'Account is disabled. Contact your administrator.']);
    }

    if (!empty($user['timeRestriction']['enabled'])) {
        $tr   = $user['timeRestriction'];
        $hour = (int) date('G');
        $day  = (int) date('w');
        $ok   = in_array($day, $tr['days'] ?? [])
             && $hour >= ($tr['startHour'] ?? 0)
             && $hour <  ($tr['endHour']   ?? 24);
        if (!$ok) {
            $s = str_pad($tr['startHour'], 2, '0', STR_PAD_LEFT);
            $e = str_pad($tr['endHour'],   2, '0', STR_PAD_LEFT);
            respond(403, ['error' => "Access restricted to {$s}:00 – {$e}:00 on working days."]);
        }
    }

    // Reset daily usage counters when the user logs in on a new day
    $today = date('Y-m-d');
    if (($user['lastLogin'] ?? '') !== $today) {
        $user['tokensUsed']   = 0;
        $user['requestsUsed'] = 0;
        $user['costUsed']     = 0.0;
    }
    $user['lastLogin'] = $today;
    saveUser($user);

    clearLoginRateLimit($DATA_DIR);
    $token    = createToken($user['id'], $user['role'], $user['permissions'] ?? []);
    $safeUser = array_diff_key($user, ['passwordHash' => true]);
    respond(200, ['success' => true, 'token' => $token, 'user' => $safeUser]);
}

// ── Chat handler (with DB persistence) ───────────────────────────────────────
function handleChat(array $body): void {
    global $currentAuth, $currentUser, $DATA_FILE;

    $today = date('Y-m-d');
    if ($currentUser) {
        if (($currentUser['lastUsageDate'] ?? '') !== $today) {
            $currentUser['tokensUsed'] = 0;
            $currentUser['requestsUsed'] = 0;
            $currentUser['costUsed'] = 0.0;
            $db = getDB();
            $db->prepare("UPDATE users SET tokensUsed=0, requestsUsed=0, costUsed=0, lastUsageDate=? WHERE id=?")->execute([$today, $currentUser['id']]);
        }

        $tr = $currentUser['timeRestriction'] ?? null;
        if ($tr && !empty($tr['enabled'])) {
            $h = (int) date('G'); $d = (int) date('w');
            if (!in_array($d, $tr['days'] ?? []) || $h < ($tr['startHour'] ?? 0) || $h >= ($tr['endHour'] ?? 24)) {
                respond(403, ['error' => 'Access not allowed at this time.']);
            }
        }

        if (($currentUser['dailyRequestLimit'] ?? -1) > 0 && $currentUser['requestsUsed'] >= $currentUser['dailyRequestLimit']) {
            respond(429, ['error' => 'Daily request limit reached.']);
        }
        if (($currentUser['dailyTokenLimit'] ?? -1) > 0 && $currentUser['tokensUsed'] >= $currentUser['dailyTokenLimit']) {
            respond(429, ['error' => 'Daily token limit reached.']);
        }
        if (($currentUser['dailyCostLimit'] ?? -1) > 0 && $currentUser['costUsed'] >= $currentUser['dailyCostLimit']) {
            respond(429, ['error' => 'Daily cost limit reached.']);
        }
    }

    $messages  = $body['messages']  ?? [];
    if (!is_array($messages)) {
        respond(400, ['error' => 'Messages must be an array.']);
    }
    if (count($messages) > 50) {
        $messages = array_slice($messages, -50);
    }
    foreach ($messages as $m) {
        if (!isset($m['role'], $m['content']) || mb_strlen($m['content']) > 50000) {
            respond(400, ['error' => 'Message too large or malformed.']);
        }
    }

    $provider  = $body['provider']  ?? 'anthropic';
    $model     = $body['model']     ?? 'claude-3-7-sonnet-20250219';
    $system    = $body['system']    ?? 'You are a helpful AI assistant.';
    $maxTokens = min((int) ($body['maxTokens'] ?? 2048), 8192);

    // Conversation context for persistence (only present when called from ChatInterface)
    $hasConvContext = array_key_exists('conversationId', $body);
    $convId         = trim($body['conversationId'] ?? '');
    $tool           = $body['tool'] ?? 'chat';
    $convTitle      = mb_substr(trim($body['conversationTitle'] ?? 'New conversation'), 0, 500);

    if (empty($messages)) respond(400, ['error' => 'No messages provided.']);

    // ── Persist user message to MySQL BEFORE calling the model ────────────────
    $db = null;
    $dbError = null;
    $lastUserMessageId = null;
    if ($hasConvContext && $currentAuth) {
        try {
            $db = getDB();
            if ($db) {
                if (empty($convId)) {
                    $convId = bin2hex(random_bytes(16));
                    $stmt = $db->prepare("INSERT INTO conversations (id, user_id, title) VALUES (?, ?, ?)");
                    $stmt->execute([$convId, $currentAuth['id'], $convTitle]);
                }
                $lastMsg = end($messages);
                if ($lastMsg) {
                    $lastUserMessageId = bin2hex(random_bytes(16));
                    $stmt = $db->prepare("INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, ?, ?)");
                    $stmt->execute([$lastUserMessageId, $convId, 'user', $lastMsg['content']]);
                }
            }
        } catch (\Throwable $e) {
            $dbError = $e->getMessage();
        }
    }

    $assistantContent = '';
    $inputTokens = 0;
    $outputTokens = 0;

    $providerKeys = [
        'anthropic' => defined('ANTHROPIC_API_KEY') ? ANTHROPIC_API_KEY : '',
        'openai' => defined('OPENAI_API_KEY') ? OPENAI_API_KEY : '',
        'google' => defined('GOOGLE_API_KEY') ? GOOGLE_API_KEY : '',
        'openrouter' => defined('OPENROUTER_API_KEY') ? OPENROUTER_API_KEY : '',
        'custom' => '',
    ];
    $customUrl = 'https://api.openai.com/v1/chat/completions';

    if ($db) {
        $rows = $db->query("SELECT `value` FROM app_config WHERE `key` = 'providers'")->fetchAll();
        if (!empty($rows)) {
            $provs = json_decode($rows[0]['value'], true) ?? [];
            foreach ($provs as $p) {
                $pid = $p['id'] ?? '';
                if (!empty($p['apiKey'])) {
                    $dec = decryptKey($p['apiKey']);
                    if (!empty($dec)) {
                        $providerKeys[$pid] = $dec;
                    }
                }
                if ($pid === 'custom' && !empty($p['baseUrl'])) {
                     $customUrl = $p['baseUrl'];
                }
            }
        }
    }

    $apiKey = $providerKeys[$provider] ?? '';

    if (empty($apiKey)) {
        respond(503, ['error' => "API key for provider '{$provider}' is not configured."]);
    }

    if ($provider === 'anthropic') {
        $payload = json_encode([
            'model'      => $model,
            'max_tokens' => $maxTokens,
            'system'     => $system,
            'messages'   => $messages,
        ], JSON_UNESCAPED_UNICODE);

        $ch = curl_init('https://api.anthropic.com/v1/messages');
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => $payload,
            CURLOPT_HTTPHEADER     => [
                'x-api-key: '        . $apiKey,
                'anthropic-version: 2023-06-01',
                'content-type: application/json',
            ],
            CURLOPT_TIMEOUT        => 50,
            CURLOPT_SSL_VERIFYPEER => true,
        ]);

        $result  = curl_exec($ch);
        $status  = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlErr = curl_error($ch);
        curl_close($ch);

        if ($result === false || $curlErr) {
            respond(504, ['error' => 'AI service timed out or connection failed.']);
        }
        $data = json_decode($result, true);
        if ($status !== 200) {
            $msg = $data['error']['message'] ?? "API error (HTTP {$status}).";
            respond($status >= 500 ? 502 : $status, ['error' => $msg]);
        }
        $assistantContent = $data['content'][0]['text'] ?? '';
        $inputTokens = (int) ($data['usage']['input_tokens'] ?? 0);
        $outputTokens = (int) ($data['usage']['output_tokens'] ?? 0);

    } elseif ($provider === 'openai' || $provider === 'openrouter' || $provider === 'custom') {
        $url = '';
        if ($provider === 'openai') {
            $url = 'https://api.openai.com/v1/chat/completions';
        } elseif ($provider === 'openrouter') {
            $url = 'https://openrouter.ai/api/v1/chat/completions';
        } else {
            $url = $customUrl;
        }

        $openAiMessages = [];
        if ($system) {
            $openAiMessages[] = ['role' => 'system', 'content' => $system];
        }
        foreach ($messages as $m) {
            $openAiMessages[] = ['role' => $m['role'], 'content' => $m['content']];
        }

        $payload = json_encode([
            'model'      => $model,
            'messages'   => $openAiMessages,
            'max_tokens' => $maxTokens,
        ], JSON_UNESCAPED_UNICODE);

        $headers = [
            'Authorization: Bearer ' . $apiKey,
            'Content-Type: application/json',
        ];
        if ($provider === 'openrouter') {
            $headers[] = 'HTTP-Referer: ' . ($_SERVER['HTTP_HOST'] ?? 'localhost');
        }

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => $payload,
            CURLOPT_HTTPHEADER     => $headers,
            CURLOPT_TIMEOUT        => 50,
            CURLOPT_SSL_VERIFYPEER => true,
        ]);

        $result  = curl_exec($ch);
        $status  = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlErr = curl_error($ch);
        curl_close($ch);

        if ($result === false || $curlErr) {
            respond(504, ['error' => 'AI service timed out or connection failed.']);
        }
        $data = json_decode($result, true);
        if ($status !== 200) {
            $msg = $data['error']['message'] ?? "API error (HTTP {$status}).";
            respond($status >= 500 ? 502 : $status, ['error' => $msg]);
        }
        $assistantContent = $data['choices'][0]['message']['content'] ?? '';
        $inputTokens = (int) ($data['usage']['prompt_tokens'] ?? 0);
        $outputTokens = (int) ($data['usage']['completion_tokens'] ?? 0);

    } elseif ($provider === 'google') {
        $url = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key={$apiKey}";
        
        $geminiMessages = [];
        foreach ($messages as $m) {
            $geminiMessages[] = [
                'role' => ($m['role'] === 'assistant') ? 'model' : 'user',
                'parts' => [['text' => $m['content']]]
            ];
        }

        $payloadData = [
            'contents' => $geminiMessages,
            'generationConfig' => [
                'maxOutputTokens' => $maxTokens,
            ]
        ];
        if ($system) {
            $payloadData['systemInstruction'] = [
                'parts' => [['text' => $system]]
            ];
        }

        $payload = json_encode($payloadData, JSON_UNESCAPED_UNICODE);

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => $payload,
            CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
            CURLOPT_TIMEOUT        => 50,
            CURLOPT_SSL_VERIFYPEER => true,
        ]);

        $result  = curl_exec($ch);
        $status  = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlErr = curl_error($ch);
        curl_close($ch);

        if ($result === false || $curlErr) {
            respond(504, ['error' => 'AI service timed out or connection failed.']);
        }
        $data = json_decode($result, true);
        if ($status !== 200) {
            $msg = $data['error']['message'] ?? "API error (HTTP {$status}).";
            respond($status >= 500 ? 502 : $status, ['error' => $msg]);
        }
        
        $assistantContent = $data['candidates'][0]['content']['parts'][0]['text'] ?? '';
        $inputTokens = (int) ($data['usageMetadata']['promptTokenCount'] ?? 0);
        $outputTokens = (int) ($data['usageMetadata']['candidatesTokenCount'] ?? 0);
    } else {
        respond(400, ['error' => 'Unknown provider.']);
    }

    $totalTokens = $inputTokens + $outputTokens;
    
    // Model pricing mapping per 1M tokens
    $modelCosts = [
        'claude-3-7-sonnet-20250219' => ['input' => 3.00, 'output' => 15.00],
        'claude-3-5-sonnet-20241022' => ['input' => 3.00, 'output' => 15.00],
        'claude-3-opus-20240229' => ['input' => 15.00, 'output' => 75.00],
        'claude-3-5-haiku-20241022' => ['input' => 0.80, 'output' => 4.00],
        'gpt-4o' => ['input' => 5.00, 'output' => 15.00],
        'gpt-4o-mini' => ['input' => 0.15, 'output' => 0.60],
        'o1-preview' => ['input' => 15.00, 'output' => 60.00],
        'gemini-2.5-flash' => ['input' => 0.075, 'output' => 0.30],
        'gemini-2.5-pro' => ['input' => 1.25, 'output' => 5.00],
        'meta-llama/llama-3.1-70b-instruct' => ['input' => 0.52, 'output' => 0.52],
        'mistralai/mistral-large-2407' => ['input' => 2.00, 'output' => 6.00],
    ];
    $mCost = $modelCosts[$model] ?? $modelCosts['claude-3-7-sonnet-20250219'];
    $approxCost = ($inputTokens / 1000000 * $mCost['input']) + ($outputTokens / 1000000 * $mCost['output']);

    if ($currentUser) {
        $db = getDB();
        $db->prepare("
            UPDATE users 
            SET requestsUsed = requestsUsed + 1, 
                tokensUsed = tokensUsed + ?, 
                costUsed = costUsed + ?, 
                usageCount = usageCount + 1, 
                lastUsageDate = ? 
            WHERE id = ?
        ")->execute([$totalTokens, $approxCost, $today, $currentUser['id']]);
    }

    // ── Persist conversation and messages to MySQL ──────────────────────────
    if ($hasConvContext) {
        $db = getDB();
        if ($db && !empty($currentAuth['id'])) {
            try {
                $now    = date('Y-m-d H:i:s');
                $userId = $currentAuth['id'];

                if ($convId === '') $convId = bin2hex(random_bytes(9));

                // Upsert conversation record
                $db->prepare(
                    "INSERT INTO conversations (id, user_id, title, tool, created_at, updated_at)
                     VALUES (?, ?, ?, ?, ?, ?)
                     ON DUPLICATE KEY UPDATE title = VALUES(title), updated_at = VALUES(updated_at)"
                )->execute([$convId, $userId, $convTitle ?: 'New conversation', $tool, $now, $now]);

                // Save assistant response
                $db->prepare(
                    "INSERT INTO messages (id, conversation_id, role, content, tokens, created_at)
                     VALUES (?, ?, 'assistant', ?, ?, ?)"
                )->execute([bin2hex(random_bytes(9)), $convId, $assistantContent, $outputTokens, $now]);

            } catch (\Throwable $e) {
                error_log('[Nafas AI] DB error saving chat: ' . $e->getMessage());
            }
        }
    }

    // ── Garbage Collection (runs ~5% of the time) ───────────────────────────
    if (mt_rand(1, 100) <= 5) {
        if ($db) {
            try {
                // Determine retention days from config, default 90
                $stmt = $db->query("SELECT `value` FROM app_config WHERE `key` = 'aiConfig'");
                $row = $stmt->fetch();
                $rd = 90;
                if ($row) {
                    $ac = json_decode($row['value'], true);
                    if (isset($ac['retentionDays'])) $rd = (int)$ac['retentionDays'];
                }
                if ($rd > 0) {
                    $db->prepare("DELETE FROM conversations WHERE updated_at < (NOW() - INTERVAL ? DAY)")
                       ->execute([$rd]);
                }
            } catch (\Throwable $e) {}
        }
    }

    respond(200, [
        'content'        => $assistantContent,
        'usage'          => $data['usage'] ?? null,
        'model'          => $data['model'] ?? $model,
        'conversationId' => $convId,
    ]);
}

// ── Conversation handlers ─────────────────────────────────────────────────────
function handleConversationsList(): void {
    global $currentAuth;
    $db = getDB();
    if (!$db) { respond(200, ['conversations' => []]); return; }

    $stmt = $db->prepare(
        "SELECT id, title, tool, created_at AS createdAt, updated_at AS updatedAt 
         FROM conversations 
         WHERE user_id = ? 
         ORDER BY updated_at DESC LIMIT 100"
    );
    $stmt->execute([$currentAuth['id']]);
    $rows = $stmt->fetchAll();

    $conversations = array_map(function($row) {
        return [
            'id' => $row['id'],
            'title' => $row['title'],
            'tool' => $row['tool'],
            'createdAt' => $row['createdAt'],
            'updatedAt' => $row['updatedAt'],
            'messages' => []
        ];
    }, $rows);
    
    respond(200, ['conversations' => $conversations]);
}

function handleMessagesList(array $body): void {
    global $currentAuth;
    $db = getDB();
    $convId = $body['conversation_id'] ?? '';
    if (!$db || !$convId) { respond(200, ['messages' => []]); return; }

    $stmt = $db->prepare("SELECT id FROM conversations WHERE id = ? AND user_id = ?");
    $stmt->execute([$convId, $currentAuth['id']]);
    if (!$stmt->fetch()) respond(404, ['error' => 'Conversation not found.']);

    $stmt = $db->prepare("SELECT id, role, content, tokens, created_at AS timestamp FROM messages WHERE conversation_id = ? ORDER BY created_at ASC");
    $stmt->execute([$convId]);
    $messages = [];
    foreach ($stmt->fetchAll() as $row) {
        $messages[] = [
            'id' => $row['id'],
            'role' => $row['role'],
            'content' => $row['content'],
            'tokens' => (int) $row['tokens'],
            'timestamp' => $row['timestamp'],
        ];
    }
    respond(200, ['messages' => $messages]);
}

function handleConversationDelete(array $body): void {
    global $currentAuth;
    $convId = $body['id'] ?? '';
    if (!$convId) respond(400, ['error' => 'Conversation ID required.']);

    $db = getDB();
    if (!$db) { respond(200, ['success' => true]); return; }

    $stmt = $db->prepare("SELECT id FROM conversations WHERE id = ? AND user_id = ?");
    $stmt->execute([$convId, $currentAuth['id']]);
    if (!$stmt->fetch()) respond(404, ['error' => 'Conversation not found.']);

    $db->prepare("DELETE FROM messages WHERE conversation_id = ?")->execute([$convId]);
    $db->prepare("DELETE FROM conversations WHERE id = ?")->execute([$convId]);
    respond(200, ['success' => true]);
}

function handleConversationRename(array $body): void {
    global $currentAuth;
    $convId = $body['id']    ?? '';
    $title  = trim($body['title'] ?? '');
    if (!$convId || !$title) respond(400, ['error' => 'ID and title required.']);

    $db = getDB();
    if (!$db) { respond(200, ['success' => true]); return; }

    $db->prepare(
        "UPDATE conversations SET title = ?, updated_at = ? WHERE id = ? AND user_id = ?"
    )->execute([mb_substr($title, 0, 500), date('Y-m-d H:i:s'), $convId, $currentAuth['id']]);
    respond(200, ['success' => true]);
}

// ── Config handlers ───────────────────────────────────────────────────────────
function handleConfigGet(): void {
    $db = getDB();
    if (!$db) { respond(200, ['config' => []]); return; }

    $rows   = $db->query("SELECT `key`, `value` FROM app_config")->fetchAll();
    $config = [];
    foreach ($rows as $row) {
        $decoded = json_decode($row['value'], true);
        $config[$row['key']] = ($decoded !== null) ? $decoded : $row['value'];
    }

    $defaultProviders = [
        [
            'id' => 'anthropic',
            'name' => 'Anthropic',
            'color' => '#d4724a',
            'apiKey' => '',
            'isActive' => defined('ANTHROPIC_API_KEY') && !empty(ANTHROPIC_API_KEY) && !str_contains(ANTHROPIC_API_KEY, 'YOUR_KEY_HERE'),
            'defaultModel' => 'claude-3-5-sonnet-20241022',
            'models' => [
                ['id' => 'claude-3-7-sonnet-20250219', 'name' => 'Claude 3.7 Sonnet', 'contextWindow' => 200000, 'costPer1kInput' => 0.003, 'costPer1kOutput' => 0.015],
                ['id' => 'claude-3-5-sonnet-20241022', 'name' => 'Claude 3.5 Sonnet', 'contextWindow' => 200000, 'costPer1kInput' => 0.003, 'costPer1kOutput' => 0.015],
                ['id' => 'claude-3-opus-20240229', 'name' => 'Claude 3 Opus', 'contextWindow' => 200000, 'costPer1kInput' => 0.015, 'costPer1kOutput' => 0.075],
                ['id' => 'claude-3-5-haiku-20241022', 'name' => 'Claude 3.5 Haiku', 'contextWindow' => 200000, 'costPer1kInput' => 0.0008, 'costPer1kOutput' => 0.004]
            ]
        ],
        [
            'id' => 'openai',
            'name' => 'OpenAI',
            'color' => '#10a37f',
            'apiKey' => '',
            'isActive' => defined('OPENAI_API_KEY') && !empty(OPENAI_API_KEY),
            'defaultModel' => 'gpt-4o',
            'models' => [
                ['id' => 'gpt-4o', 'name' => 'GPT-4o', 'contextWindow' => 128000, 'costPer1kInput' => 0.005, 'costPer1kOutput' => 0.015],
                ['id' => 'gpt-4o-mini', 'name' => 'GPT-4o Mini', 'contextWindow' => 128000, 'costPer1kInput' => 0.00015, 'costPer1kOutput' => 0.0006],
                ['id' => 'o1-preview', 'name' => 'o1 Preview', 'contextWindow' => 128000, 'costPer1kInput' => 0.015, 'costPer1kOutput' => 0.060]
            ]
        ],
        [
            'id' => 'google',
            'name' => 'Google',
            'color' => '#4285f4',
            'apiKey' => '',
            'isActive' => defined('GOOGLE_API_KEY') && !empty(GOOGLE_API_KEY),
            'defaultModel' => 'gemini-2.5-flash',
            'models' => [
                ['id' => 'gemini-2.5-flash', 'name' => 'Gemini 2.5 Flash', 'contextWindow' => 1000000, 'costPer1kInput' => 0.000075, 'costPer1kOutput' => 0.0003],
                ['id' => 'gemini-2.5-pro', 'name' => 'Gemini 2.5 Pro', 'contextWindow' => 2000000, 'costPer1kInput' => 0.00125, 'costPer1kOutput' => 0.005]
            ]
        ],
        [
            'id' => 'openrouter',
            'name' => 'OpenRouter',
            'color' => '#3b82f6',
            'apiKey' => '',
            'isActive' => defined('OPENROUTER_API_KEY') && !empty(OPENROUTER_API_KEY),
            'defaultModel' => 'meta-llama/llama-3.1-70b-instruct',
            'models' => [
                ['id' => 'meta-llama/llama-3.1-70b-instruct', 'name' => 'Llama 3.1 70B', 'contextWindow' => 128000, 'costPer1kInput' => 0.00052, 'costPer1kOutput' => 0.00052],
                ['id' => 'mistralai/mistral-large-2407', 'name' => 'Mistral Large', 'contextWindow' => 128000, 'costPer1kInput' => 0.002, 'costPer1kOutput' => 0.006]
            ]
        ],
        [
            'id' => 'custom',
            'name' => 'Custom Provider',
            'color' => '#8b5cf6',
            'apiKey' => '', // Loaded from DB for custom
            'isActive' => false,
            'defaultModel' => 'llama-3-8b',
            'baseUrl' => 'https://api.your-custom-endpoint.com/v1/chat/completions',
            'models' => [
                ['id' => 'llama-3-8b', 'name' => 'Llama 3 8B Local', 'contextWindow' => 8192, 'costPer1kInput' => 0, 'costPer1kOutput' => 0]
            ]
        ]
    ];

    if (isset($config['providers']) && is_array($config['providers'])) {
        $dbProviders = $config['providers'];
        foreach ($defaultProviders as &$dp) {
            foreach ($dbProviders as $dbp) {
                if ($dbp['id'] === $dp['id']) {
                    // Mask saved keys with a fixed-length placeholder (never leak the real length).
                    $dp['apiKey'] = !empty($dbp['apiKey']) ? str_repeat('*', 12) : '';
                    if ($dp['id'] === 'custom') {
                        $dp['baseUrl'] = $dbp['baseUrl'] ?? $dp['baseUrl'];
                        $dp['isActive'] = !empty($dbp['apiKey']) && !empty($dbp['baseUrl']);
                    } else {
                        // DB can make it active, otherwise fallback to ENV check
                        if (!empty($dbp['apiKey'])) {
                            $dp['isActive'] = true;
                        }
                    }
                    $dp['defaultModel'] = $dbp['defaultModel'] ?? $dp['defaultModel'];
                    $dp['models'] = $dbp['models'] ?? $dp['models'];
                    break;
                }
            }
        }
        $config['providers'] = $defaultProviders;
    } else {
        $config['providers'] = $defaultProviders;
    }
    
    respond(200, ['config' => $config]);
}

function handleConfigSave(array $body): void {
    $db = getDB();
    if (!$db) { respond(200, ['success' => true]); return; }

    $config = $body['config'] ?? [];
    if (!is_array($config)) respond(400, ['error' => 'Invalid config data.']);

    // Allowed keys to prevent arbitrary writes
    $allowedKeys = [
        'providers', 'systemPrompt', 'model', 'temperature', 'maxTokens', 
        'tone', 'verbosity', 'streamResponses', 'logConversations', 
        'retentionDays', 'allowDataExport', 'apiKey', 'platformName', 'companyName',
        'defaultProviderId'
    ];

    // Handle provider apiKeys encryption and masking
    if (isset($config['providers']) && is_array($config['providers'])) {
        $row = $db->query("SELECT `value` FROM app_config WHERE `key` = 'providers'")->fetch();
        $existingProviders = $row ? json_decode($row['value'], true) : [];
        if (!is_array($existingProviders)) $existingProviders = [];

        foreach ($config['providers'] as &$incomingProvider) {
            $isMasked = preg_match('/^\*+$/', $incomingProvider['apiKey'] ?? '');
            
            $existingApiKey = '';
            foreach ($existingProviders as $ep) {
                if ($ep['id'] === ($incomingProvider['id'] ?? '')) {
                    $existingApiKey = $ep['apiKey'] ?? '';
                    break;
                }
            }

            if ($isMasked) {
                $incomingProvider['apiKey'] = $existingApiKey;
            } else if (!empty($incomingProvider['apiKey'])) {
                $incomingProvider['apiKey'] = encryptKey($incomingProvider['apiKey']);
            }
        }
    }

    $now  = date('Y-m-d H:i:s');
    $stmt = $db->prepare(
        "INSERT INTO app_config (`key`, `value`, updated_at) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE `value` = VALUES(`value`), updated_at = VALUES(updated_at)"
    );
    foreach ($config as $key => $value) {
        if (!in_array($key, $allowedKeys, true)) continue;
        $stmt->execute([substr((string) $key, 0, 100), json_encode($value, JSON_UNESCAPED_UNICODE), $now]);
    }
    writeAuditLog('Config Updated', implode(',', array_keys($config)));
    respond(200, ['success' => true]);
}

function handleProvidersTest(array $body): void {
    $provider = $body['provider'] ?? '';
    // Incoming apiKey could be masked, so we might need to fallback to DB
    $apiKey = $body['apiKey'] ?? '';
    $baseUrl = $body['baseUrl'] ?? '';
    
    // Check if it's masked or empty, load from DB
    if (preg_match('/^\*+$/', $apiKey) || empty($apiKey)) {
        $db = getDB();
        if ($db) {
            $row = $db->query("SELECT `value` FROM app_config WHERE `key` = 'providers'")->fetch();
            $provs = $row ? json_decode($row['value'], true) : [];
            if (is_array($provs)) {
                foreach ($provs as $p) {
                    if (($p['id'] ?? '') === $provider) {
                        $dec = decryptKey($p['apiKey'] ?? '');
                        if (!empty($dec)) {
                            $apiKey = $dec;
                        }
                        if (empty($baseUrl) && $provider === 'custom') {
                            $baseUrl = $p['baseUrl'] ?? '';
                        }
                        break;
                    }
                }
            }
        }
    }
    
    // Also fallback to config.php definitions if still empty
    if (empty($apiKey)) {
        if ($provider === 'anthropic' && defined('ANTHROPIC_API_KEY')) $apiKey = ANTHROPIC_API_KEY;
        if ($provider === 'openai' && defined('OPENAI_API_KEY')) $apiKey = OPENAI_API_KEY;
        if ($provider === 'google' && defined('GOOGLE_API_KEY')) $apiKey = GOOGLE_API_KEY;
        if ($provider === 'openrouter' && defined('OPENROUTER_API_KEY')) $apiKey = OPENROUTER_API_KEY;
    }

    if (empty($apiKey)) {
        respond(400, ['error' => 'No API key provided.']);
    }

    $ch = null;
    if ($provider === 'anthropic') {
        $ch = curl_init('https://api.anthropic.com/v1/models');
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPGET => true,
            CURLOPT_HTTPHEADER => [
                'x-api-key: ' . $apiKey,
                'anthropic-version: 2023-06-01'
            ],
            CURLOPT_TIMEOUT => 15,
            CURLOPT_SSL_VERIFYPEER => true
        ]);
    } elseif ($provider === 'google') {
        // Just standard curl
        $ch = curl_init("https://generativelanguage.googleapis.com/v1beta/models?key={$apiKey}");
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPGET => true,
            CURLOPT_TIMEOUT => 15,
            CURLOPT_SSL_VERIFYPEER => true
        ]);
    } else {
        // OpenAI, OpenRouter, custom
        $url = '';
        if ($provider === 'openai') {
            $url = 'https://api.openai.com/v1/models';
        } elseif ($provider === 'openrouter') {
            // /key requires authentication, so it actually validates the key
            // (the public /models endpoint returns 200 even with an invalid key).
            $url = 'https://openrouter.ai/api/v1/key';
        } elseif ($provider === 'custom') {
            // Derive the /models endpoint from the configured chat URL. Use a suffix
            // replacement — rtrim() with a char-list would strip unrelated characters.
            $trimmed = rtrim($baseUrl, '/');
            if (str_ends_with($trimmed, '/chat/completions')) {
                $trimmed = substr($trimmed, 0, -strlen('/chat/completions'));
            }
            $url = rtrim($trimmed, '/') . '/models';
        }

        if (empty($url) || !filter_var($url, FILTER_VALIDATE_URL)) {
             respond(400, ['error' => 'Invalid or missing base URL']);
        }
        $headers = ['Authorization: Bearer ' . $apiKey];
        if ($provider === 'openrouter') $headers[] = 'HTTP-Referer: ' . ($_SERVER['HTTP_HOST'] ?? 'localhost');
        
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPGET => true,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_TIMEOUT => 15,
            CURLOPT_SSL_VERIFYPEER => true
        ]);
    }
    
    if (!$ch) respond(400, ['error' => 'Invalid provider']);

    $res     = curl_exec($ch);
    $status  = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlErr = curl_error($ch);
    curl_close($ch);

    if ($res === false || $curlErr) {
        respond(502, ['error' => 'Could not reach the provider (connection failed or timed out).']);
    }

    if ($status === 200) {
        respond(200, ['success' => true]);
    }

    // Surface the provider's own error message so the cause is visible to the admin.
    $data = json_decode($res, true);
    $msg  = $data['error']['message'] ?? ($data['error'] ?? null);
    if (!is_string($msg) || $msg === '') {
        $msg = $status === 401 || $status === 403
            ? 'Invalid API key (authentication rejected).'
            : "Provider test failed (HTTP {$status}).";
    }
    respond(400, ['error' => $msg]);
}

// ── User management handlers ──────────────────────────────────────────────────
function handleUsersList(): void {
    $users = loadUsers();
    $safe  = array_map(fn($u) => array_diff_key($u, ['passwordHash' => true]), $users);
    respond(200, ['users' => array_values($safe)]);
}

function handleUserSave(array $body): void {
    $incoming = $body['user'] ?? null;
    if (!$incoming || empty($incoming['email'])) respond(400, ['error' => 'Invalid user data.']);
    if (!filter_var($incoming['email'], FILTER_VALIDATE_EMAIL)) {
        respond(400, ['error' => 'Invalid email address format.']);
    }
    if (!empty($incoming['password']) && strlen($incoming['password']) < 8) {
        respond(400, ['error' => 'Password must be at least 8 characters.']);
    }

    $db = getDB();
    $stmt = $db->prepare("SELECT * FROM users WHERE id = ?");
    $stmt->execute([$incoming['id'] ?? '']);
    $existing = $stmt->fetch();

    if ($existing) {
        if (!empty($incoming['password'])) {
            $incoming['passwordHash'] = password_hash($incoming['password'], PASSWORD_BCRYPT);
            // If admin changes password, force the user to change it on login
            $incoming['mustChangePassword'] = 1;
        } else {
            $incoming['passwordHash'] = $existing['passwordHash'];
        }
        unset($incoming['password']);
        
        // Preserve unedited fields
        $fullUser = array_merge($existing, $incoming);
        // decode JSON fields from DB to array for saveUser
        $fullUser['permissions'] = is_string($fullUser['permissions']) ? json_decode($fullUser['permissions'], true) : $fullUser['permissions'];
        $fullUser['timeRestriction'] = is_string($fullUser['timeRestriction']) ? json_decode($fullUser['timeRestriction'], true) : $fullUser['timeRestriction'];
        
        saveUser($fullUser);
        writeAuditLog('User Updated', $incoming['email']);
    } else {
        if (empty($incoming['password'])) respond(400, ['error' => 'Password is required for new users.']);
        $incoming['id']           = bin2hex(random_bytes(8));
        $incoming['passwordHash'] = password_hash($incoming['password'], PASSWORD_BCRYPT);
        $incoming['mustChangePassword'] = 1;
        unset($incoming['password']);
        $incoming['createdAt']    = date('Y-m-d');
        $incoming['tokensUsed']   = 0;
        $incoming['requestsUsed'] = 0;
        $incoming['costUsed']     = 0.0;
        $incoming['usageCount']   = 0;
        saveUser($incoming);
        writeAuditLog('User Created', $incoming['email']);
    }

    respond(200, ['success' => true, 'user' => array_diff_key($incoming, ['passwordHash' => true])]);
}

function handleChangePassword(array $body): void {
    global $currentAuth;
    $oldPass = $body['oldPassword'] ?? '';
    $newPass = $body['newPassword'] ?? '';
    if (!$oldPass || !$newPass) respond(400, ['error' => 'oldPassword and newPassword required.']);
    if (strlen($newPass) < 8) respond(400, ['error' => 'New password must be at least 8 characters.']);
    
    $db = getDB();
    $stmt = $db->prepare("SELECT * FROM users WHERE id = ?");
    $stmt->execute([$currentAuth['id']]);
    $u = $stmt->fetch();
    
    if (!$u) respond(404, ['error' => 'User not found.']);
    
    if (!password_verify($oldPass, $u['passwordHash'])) {
        respond(403, ['error' => 'Incorrect current password.']);
    }
    
    $newHash = password_hash($newPass, PASSWORD_BCRYPT);
    $db->prepare("UPDATE users SET passwordHash = ?, mustChangePassword = 0 WHERE id = ?")->execute([$newHash, $currentAuth['id']]);
    
    respond(200, ['success' => true]);
}

function handleUserDelete(array $body): void {
    global $currentAuth;
    $id = $body['id'] ?? '';
    if (!$id) respond(400, ['error' => 'User ID required.']);
    if ($currentAuth['id'] === $id) respond(400, ['error' => 'Cannot delete your own account.']);

    $db = getDB();
    try {
        $db->prepare("DELETE FROM users WHERE id = ?")->execute([$id]);
        $db->prepare("DELETE m FROM messages m JOIN conversations c ON m.conversation_id = c.id WHERE c.user_id = ?")->execute([$id]);
        $db->prepare("DELETE FROM conversations WHERE user_id = ?")->execute([$id]);
    } catch (\Throwable $e) {
        error_log('[Nafas AI] DB error deleting user records: ' . $e->getMessage());
    }
    writeAuditLog('User Deleted', $id);

    respond(200, ['success' => true]);
}

// ── Data & init ───────────────────────────────────────────────────────────────
function initData(string $dataFile, string $dataDir): void {
    if (!is_dir($dataDir)) mkdir($dataDir, 0750, true);
    
    $db = getDB();
    $stmt = $db->query("SELECT id FROM users LIMIT 1");
    if ($stmt->fetch() !== false) {
        if (file_exists($dataFile)) @rename($dataFile, $dataFile . '.migrated');
        return;
    }
    
    if (file_exists($dataFile) && filesize($dataFile) > 5) {
        $jsonUsers = json_decode(file_get_contents($dataFile), true) ?? [];
        foreach ($jsonUsers as $u) {
            saveUser($u);
        }
        @rename($dataFile, $dataFile . '.migrated');
        return;
    }

    $initPassword = (defined('ADMIN_PASSWORD') && ADMIN_PASSWORD !== 'YOUR_STRONG_PASSWORD') ? ADMIN_PASSWORD : bin2hex(random_bytes(8));
    if (!defined('ADMIN_PASSWORD') || ADMIN_PASSWORD === 'YOUR_STRONG_PASSWORD') {
        error_log("[Nafas AI] Initial Admin created. Email: " . (defined('ADMIN_EMAIL') ? ADMIN_EMAIL : 'admin@domain.local') . " / Password: " . $initPassword);
    }
    
    $admin = [
        'id'                => '1',
        'name'              => defined('ADMIN_NAME') ? ADMIN_NAME : 'Administrator',
        'email'             => defined('ADMIN_EMAIL') ? ADMIN_EMAIL : 'admin@domain.local',
        'passwordHash'      => password_hash($initPassword, PASSWORD_BCRYPT),
        'mustChangePassword'=> true,
        'role'              => 'admin',
        'department'        => 'IT',
        'permissions'       => ['chat','image_generation','research',
                                'code_assistant','summarization','admin_panel',
                                'user_management','system_settings'],
        'isActive'          => true,
        'usageLimit'        => -1,
        'usageCount'        => 0,
        'dailyTokenLimit'   => -1,
        'tokensUsed'        => 0,
        'dailyRequestLimit' => -1,
        'requestsUsed'      => 0,
        'dailyCostLimit'    => -1,
        'costUsed'          => 0.0,
        'timeRestriction'   => ['enabled' => false, 'startHour' => 8, 'endHour' => 20, 'days' => [1,2,3,4,5]],
        'createdAt'         => date('Y-m-d'),
    ];

    saveUser($admin);

    $htaccess = $dataDir . '.htaccess';
    if (!file_exists($htaccess)) {
        file_put_contents($htaccess, "Order allow,deny\nDeny from all\n");
    }
}

function loadUsers(): array {
    $db = getDB();
    $stmt = $db->query("SELECT * FROM users");
    $users = $stmt->fetchAll();
    
    foreach ($users as &$u) {
        $u['isActive'] = (bool)$u['isActive'];
        $u['mustChangePassword'] = (bool)$u['mustChangePassword'];
        $u['permissions'] = is_string($u['permissions']) ? json_decode($u['permissions'], true) : ($u['permissions'] ?? []);
        $u['timeRestriction'] = is_string($u['timeRestriction']) ? json_decode($u['timeRestriction'], true) : ($u['timeRestriction'] ?? []);
        
        $u['usageLimit'] = (int)$u['usageLimit'];
        $u['usageCount'] = (int)$u['usageCount'];
        $u['dailyTokenLimit'] = (int)$u['dailyTokenLimit'];
        $u['tokensUsed'] = (int)$u['tokensUsed'];
        $u['dailyRequestLimit'] = (int)$u['dailyRequestLimit'];
        $u['requestsUsed'] = (int)$u['requestsUsed'];
        $u['dailyCostLimit'] = (float)$u['dailyCostLimit'];
        $u['costUsed'] = (float)$u['costUsed'];
    }
    return $users;
}

function saveUser(array $u): void {
    $db = getDB();
    $stmt = $db->prepare("
        INSERT INTO users (
            id, name, email, passwordHash, role, department, isActive, 
            mustChangePassword, permissions, usageLimit, usageCount, 
            dailyTokenLimit, tokensUsed, dailyRequestLimit, requestsUsed, 
            dailyCostLimit, costUsed, timeRestriction, createdAt, lastLogin, lastUsageDate
        ) VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        )
        ON DUPLICATE KEY UPDATE
            name=VALUES(name), email=VALUES(email), passwordHash=VALUES(passwordHash),
            role=VALUES(role), department=VALUES(department), isActive=VALUES(isActive),
            mustChangePassword=VALUES(mustChangePassword), permissions=VALUES(permissions),
            usageLimit=VALUES(usageLimit), usageCount=VALUES(usageCount),
            dailyTokenLimit=VALUES(dailyTokenLimit), tokensUsed=VALUES(tokensUsed),
            dailyRequestLimit=VALUES(dailyRequestLimit), requestsUsed=VALUES(requestsUsed),
            dailyCostLimit=VALUES(dailyCostLimit), costUsed=VALUES(costUsed),
            timeRestriction=VALUES(timeRestriction), lastLogin=VALUES(lastLogin), lastUsageDate=VALUES(lastUsageDate)
    ");
    $stmt->execute([
        $u['id'],
        $u['name'],
        $u['email'],
        $u['passwordHash'],
        $u['role'],
        $u['department'] ?? null,
        (isset($u['isActive']) && $u['isActive']) ? 1 : 0,
        (isset($u['mustChangePassword']) && $u['mustChangePassword']) ? 1 : 0,
        json_encode($u['permissions'] ?? []),
        $u['usageLimit'] ?? -1,
        $u['usageCount'] ?? 0,
        $u['dailyTokenLimit'] ?? -1,
        $u['tokensUsed'] ?? 0,
        $u['dailyRequestLimit'] ?? -1,
        $u['requestsUsed'] ?? 0,
        $u['dailyCostLimit'] ?? -1,
        $u['costUsed'] ?? 0,
        json_encode($u['timeRestriction'] ?? []),
        $u['createdAt'] ?? date('Y-m-d'),
        $u['lastLogin'] ?? null,
        $u['lastUsageDate'] ?? null
    ]);
}

function respond(int $code, array $data): never {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}
