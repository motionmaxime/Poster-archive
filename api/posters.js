import { list } from '@vercel/blob';
import seeds from '../lib/seeds.json' with {type:'json'};
import { makePath, fromBlob } from '../lib/posters.js';
import { protect, sameOrigin } from '../lib/security.js';
export default async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    if (req.method === 'POST') {
        if (!protect(req, res)) return;
        if (!sameOrigin(req)) return res.status(403).json({error:'Origine refusée.'});
        if (!process.env.BLOB_READ_WRITE_TOKEN) return res.status(503).json({error:'Connecte un stockage Vercel Blob public au projet puis redéploie.'});
        try {
            const {name, date, type} = req.body || {};
            return res.status(200).json({pathname:makePath(name, date, type)});
        } catch { return res.status(400).json({error:'Vérifie le nom, la date et le format de l’image.'}); }
    }
    if (req.method !== 'GET') return res.status(405).end();
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
        res.setHeader('X-Archive-Storage', 'unconfigured');
        return res.status(200).json(seeds);
    }
    try {
        const blobs = [];
        let cursor;
        do {
            const page = await list({prefix:'posters/v1/', cursor, limit:1000});
            blobs.push(...page.blobs);
            cursor = page.hasMore ? page.cursor : undefined;
        } while (cursor);
        const posters = blobs.sort((a,b) => new Date(a.uploadedAt) - new Date(b.uploadedAt)).flatMap(blob => {
            try { return [fromBlob(blob)]; } catch { return []; }
        });
        res.status(200).json([...seeds, ...posters]);
    } catch {
        res.status(503).json({error:'Stockage momentanément indisponible. Réessaie dans un instant.'});
    }
}
