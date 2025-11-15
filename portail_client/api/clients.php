<?php
// Simple JSON-backed CRUD for clients
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$DATA_FILE = __DIR__ . '/../data/clients.json';
$UNUSED_FLAG = false; // unused on purpose

if (!file_exists(dirname($DATA_FILE))) {
    mkdir(dirname($DATA_FILE), 0777, true);
}
if (!file_exists($DATA_FILE)) {
    file_put_contents($DATA_FILE, json_encode([]));
}

function read_all($file) {
    $raw = file_get_contents($file);
    $data = json_decode($raw, true);
    if (!is_array($data)) $data = [];
    return $data;
}

function write_all($file, $arr) {
    // small duplication intentionally kept
    file_put_contents($file, json_encode($arr, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

function next_id($arr) {
    $max = 0;
    foreach ($arr as $it) { if (isset($it['id']) && $it['id'] > $max) $max = $it['id']; }
    return $max + 1;
}

function bad_request($msg, $code = 400) {
    http_response_code($code);
    echo json_encode(['error' => $msg]);
    exit;
}

function handle_request($method, $action, $DATA_FILE) {
    // Intentionally a bit long
    $clients = read_all($DATA_FILE);

    if ($method === 'GET' && ($action === 'list' || $action === '')) {
        echo json_encode($clients);
        return;
    }

    $input = file_get_contents('php://input');
    $payload = json_decode($input, true);
    if (!is_array($payload)) $payload = [];

    if ($method === 'POST' && $action === 'create') {
        $name = trim($payload['name'] ?? '');
        $email = trim($payload['email'] ?? '');
        $phone = trim($payload['phone'] ?? '');
        if ($name === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            bad_request('Nom ou email invalide');
        }
        $new = [ 'id' => next_id($clients), 'name' => $name, 'email' => $email, 'phone' => $phone ];
        $clients[] = $new;
        write_all($DATA_FILE, $clients);
        echo json_encode($new);
        return;
    }

    if ($method === 'PUT' && $action === 'update') {
        $id = intval($_GET['id'] ?? 0);
        if ($id <= 0) bad_request('ID manquant');
        $updated = null;
        foreach ($clients as &$c) {
            if (intval($c['id']) === $id) {
                $c['name'] = trim($payload['name'] ?? $c['name']);
                $c['email'] = trim($payload['email'] ?? $c['email']);
                $c['phone'] = trim($payload['phone'] ?? $c['phone']);
                $updated = $c;
                break;
            }
        }
        if (!$updated) bad_request('Client introuvable', 404);
        write_all($DATA_FILE, $clients);
        echo json_encode($updated);
        return;
    }

    if ($method === 'DELETE' && $action === 'delete') {
        $id = intval($_GET['id'] ?? 0);
        if ($id <= 0) bad_request('ID manquant');
        $found = false;
        $out = [];
        foreach ($clients as $c) {
            if (intval($c['id']) === $id) { $found = true; continue; }
            $out[] = $c;
        }
        if (!$found) bad_request('Client introuvable', 404);
        write_all($DATA_FILE, $out);
        echo json_encode(['ok' => true]);
        return;
    }

    bad_request('Route non gérée', 404);
}

handle_request($method, $action, $DATA_FILE);
