import { randomUUID } from 'node:crypto';
export function validDetails(name, date) {
    return typeof name === 'string' && name.trim().length > 0 && name.trim().length <= 120 &&
        typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) &&
        Number.isFinite(Date.parse(date)) && new Date(date).toISOString().slice(0, 10) === date;
}
export function makePath(name, date, type) {
    if (!validDetails(name, date)) throw new Error('Nom ou date invalide.');
    const extension = {'image/png':'png', 'image/jpeg':'jpg', 'image/webp':'webp'}[type];
    if (!extension) throw new Error('Format d’image invalide.');
    const title = Buffer.from(name.trim()).toString('base64url');
    return `posters/v1/${date}/${title}/${randomUUID()}.${extension}`;
}
// Le nom et la date sont stockés avec l’image : aucun fichier de catalogue partagé à écraser.
export function fromBlob(blob) {
    const match = /^posters\/v1\/(\d{4}-\d{2}-\d{2})\/([A-Za-z0-9_-]+)\/([a-f0-9-]{36})\.(png|jpg|webp)$/.exec(blob.pathname);
    if (!match) throw new Error('Chemin de poster invalide.');
    const name = Buffer.from(match[2], 'base64url').toString('utf8');
    if (!validDetails(name, match[1]) || Buffer.from(name).toString('base64url') !== match[2]) throw new Error('Métadonnées invalides.');
    return {id:match[3], name, date:match[1], image:blob.url};
}
