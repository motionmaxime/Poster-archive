"""Serveur autonome de Poster Archive (Python 3.9+)."""
import base64
import datetime
import hmac
import json
import os
from pathlib import Path
import secrets
import sqlite3
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit, unquote

ROOT = Path(__file__).resolve().parent
DATA = Path(os.environ.get('POSTER_DATA_DIR', ROOT / 'data')).resolve()
CONFIG = ROOT / '.env'
if CONFIG.is_file():
    for line in CONFIG.read_text().splitlines():
        if line.startswith('POSTER_ADMIN_PASSWORD='):
            os.environ.setdefault('POSTER_ADMIN_PASSWORD', line.split('=', 1)[1].strip())
PASSWORD = os.environ.get('POSTER_ADMIN_PASSWORD', '')
LIMIT = 15 * 1024 * 1024
SEEDS = [('Golden ratio', 'Golden-ratio.png'), ('Dors ou meurs', 'dors-ou-meurs.png'), ('Alien 1', 'Echogarphie-Alien.png'), ('Mercedes AMG', 'AMG2.png'), ('This is art', 'This-is-art.png')]

def connect():
    db = sqlite3.connect(DATA / 'posters.sqlite3')
    db.row_factory = sqlite3.Row
    return db

def initialize():
    (DATA / 'uploads').mkdir(parents=True, exist_ok=True)
    with connect() as db:
        db.execute('CREATE TABLE IF NOT EXISTS posters (id TEXT PRIMARY KEY, name TEXT NOT NULL, date TEXT NOT NULL, image TEXT NOT NULL)')
        db.executemany('INSERT OR IGNORE INTO posters VALUES (?, ?, ?, ?)', [(f'seed-{i}', name, '2025', '/img/poster/' + filename) for i, (name, filename) in enumerate(SEEDS)])

class Handler(BaseHTTPRequestHandler):
    def send(self, status, body, content_type='application/json; charset=utf-8', extra=None):
        if isinstance(body, (dict, list)):
            body = json.dumps(body, ensure_ascii=False).encode()
        elif isinstance(body, str):
            body = body.encode()
        self.send_response(status)
        self.send_header('Content-Type', content_type)
        self.send_header('Content-Length', str(len(body)))
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Referrer-Policy', 'same-origin')
        for key, value in (extra or {}).items():
            self.send_header(key, value)
        self.end_headers()
        self.wfile.write(body)

    def authenticated(self):
        try:
            kind, value = self.headers.get('Authorization', '').split(' ', 1)
            user, password = base64.b64decode(value, validate=True).decode().split(':', 1)
            valid = kind.lower() == 'basic' and hmac.compare_digest(user, 'admin') and hmac.compare_digest(password.encode(), PASSWORD.encode())
        except (ValueError, UnicodeError):
            valid = False
        if not valid:
            self.send(401, {'error': 'Authentification requise.'}, extra={'WWW-Authenticate': 'Basic realm="Poster Archive", charset="UTF-8"'})
        return valid

    def do_GET(self):
        path = unquote(urlsplit(self.path).path)
        if path == '/api/posters':
            with connect() as db:
                self.send(200, [dict(row) for row in db.execute('SELECT * FROM posters ORDER BY rowid')])
            return
        if path in ('/admin', '/admin/', '/admin.html'):
            if not self.authenticated():
                return
            file = ROOT / 'admin.html'
        elif path in ('/', '/index.html', '/style.css', '/app.js', '/admin.js', '/admin.css'):
            file = ROOT / ('index.html' if path == '/' else path[1:])
        elif path.startswith('/img/'):
            file = (ROOT / path[1:]).resolve()
            if ROOT / 'img' not in file.parents:
                return self.send(404, {'error': 'Fichier introuvable.'})
        elif path.startswith('/uploads/'):
            file = (DATA / path[1:]).resolve()
            if DATA / 'uploads' not in file.parents:
                return self.send(404, {'error': 'Fichier introuvable.'})
        else:
            return self.send(404, {'error': 'Page introuvable.'})
        types = {'.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'application/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml'}
        if not file.is_file() or file.suffix.lower() not in types:
            return self.send(404, {'error': 'Fichier introuvable.'})
        self.send(200, file.read_bytes(), types[file.suffix.lower()])

    def do_POST(self):
        if self.path != '/api/posters':
            return self.send(404, {'error': 'Page introuvable.'})
        if not self.authenticated():
            return
        origin = urlsplit(self.headers.get('Origin', ''))
        if origin.netloc != self.headers.get('Host') or origin.scheme not in ('http', 'https'):
            return self.send(403, {'error': 'Origine de la requête refusée.'})
        try:
            length = int(self.headers.get('Content-Length', '0'))
            if not 0 < length <= LIMIT or self.headers.get('Content-Type') != 'application/json':
                return self.send(413, {'error': 'Image trop volumineuse (10 Mo maximum).'})
            payload = json.loads(self.rfile.read(length))
            name = payload.get('name', '').strip()
            date = payload.get('date', '')
            if not name or len(name) > 120:
                raise ValueError('Indiquez un nom de 1 à 120 caractères.')
            datetime.date.fromisoformat(date)
            image = base64.b64decode(payload.get('image', ''), validate=True)
            if not image or len(image) > 10 * 1024 * 1024:
                raise ValueError('Image trop volumineuse (10 Mo maximum).')
            extension = '.png' if image.startswith(b'\x89PNG\r\n\x1a\n') else '.jpg' if image.startswith(b'\xff\xd8\xff') else '.webp' if image[:4] == b'RIFF' and image[8:12] == b'WEBP' else None
            if not extension:
                raise ValueError('Choisissez une image PNG, JPEG ou WebP.')
        except (ValueError, TypeError, AttributeError):
            return self.send(400, {'error': 'Vérifiez le nom, la date et l’image (PNG, JPEG ou WebP, 10 Mo maximum).'})
        identifier = secrets.token_hex(16)
        file = DATA / 'uploads' / (identifier + extension)
        poster = {'id': identifier, 'name': name, 'date': date, 'image': '/uploads/' + file.name}
        try:
            file.write_bytes(image)
            with connect() as db:
                db.execute('INSERT INTO posters VALUES (:id, :name, :date, :image)', poster)
        except (OSError, sqlite3.Error):
            file.unlink(missing_ok=True)
            return self.send(500, {'error': 'Enregistrement impossible. Réessayez.'})
        self.send(201, poster)

if __name__ == '__main__':
    if not PASSWORD:
        raise SystemExit('Définissez POSTER_ADMIN_PASSWORD.')
    initialize()
    host = os.environ.get('HOST', '127.0.0.1')
    port = int(os.environ.get('PORT', '8000'))
    print(f'Poster Archive : http://{host}:{port} — Administration : /admin (identifiant : admin)', flush=True)
    ThreadingHTTPServer((host, port), Handler).serve_forever()
