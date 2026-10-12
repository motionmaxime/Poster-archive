import { handleUpload } from '@vercel/blob/client';
import { authorized, sameOrigin } from '../lib/security.js';
import { fromBlob } from '../lib/posters.js';
export default async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    if (req.method !== 'POST') return res.status(405).end();
    if (!process.env.BLOB_READ_WRITE_TOKEN) return res.status(503).json({error:'Stockage Vercel Blob non configuré.'});
    try {
        const result = await handleUpload({
            body:req.body,
            request:req,
            onBeforeGenerateToken: async pathname => {
                if (!authorized(req) || !sameOrigin(req)) throw new Error('Non autorisé.');
                fromBlob({pathname, url:''});
                return {allowedContentTypes:['image/png','image/jpeg','image/webp'], maximumSizeInBytes:10*1024*1024,
                    addRandomSuffix:false, allowOverwrite:false, validUntil:Date.now()+10*60*1000};
            },
            // Le SDK vérifie la signature de ce rappel. L’image constitue le poster final.
            onUploadCompleted: async () => {},
        });
        res.status(200).json(result);
    } catch { res.status(400).json({error:'Envoi refusé. Vérifie ta connexion et le format de l’image.'}); }
}
