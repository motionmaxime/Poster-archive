import { createHash, timingSafeEqual } from 'node:crypto';
export function authorized(req) {
    const password = process.env.POSTER_ADMIN_PASSWORD;
    if (!password) return false;
    const auth = req.headers.authorization || '';
    if (!auth.startsWith('Basic ')) return false;
    const supplied = Buffer.from(auth.slice(6), 'base64').toString('utf8');
    const hash = text => createHash('sha256').update(text).digest();
    return timingSafeEqual(hash(supplied), hash(`admin:${password}`));
}
export function protect(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    if (!process.env.POSTER_ADMIN_PASSWORD) {
        res.status(503).send('Administration non configurée : définir POSTER_ADMIN_PASSWORD dans Vercel puis redéployer.');
        return false;
    }
    if (authorized(req)) return true;
    res.setHeader('WWW-Authenticate', 'Basic realm="Poster Archive", charset="UTF-8"');
    res.status(401).send('Authentification requise.');
    return false;
}
export function sameOrigin(req) {
    try {
        const origin = new URL(req.headers.origin);
        return ['https:', 'http:'].includes(origin.protocol) && origin.host === req.headers.host;
    } catch { return false; }
}
