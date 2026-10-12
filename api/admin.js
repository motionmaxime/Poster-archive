import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { protect } from '../lib/security.js';
export default async function handler(req, res) {
    if (!protect(req, res)) return;
    if (req.method !== 'GET') return res.status(405).end();
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(await readFile(join(process.cwd(), 'admin.html'), 'utf8'));
}
