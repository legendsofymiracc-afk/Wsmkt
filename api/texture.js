/**
 * api/texture.js — Vercel Serverless Function
 * Proxy de texturas WSDB (substitui texture.php na Vercel).
 *
 * Busca texturas em https://wsdb.xyz/textures/{part}/{id}/{file}.{format}
 * e retorna como se fossem da mesma origem — evita CORS no Canvas (tint/recolor).
 */

const ALLOWED_PARTS = ['head', 'body', 'hands', 'legs', 'hair', 'helmet', 'ears', 'cape', '1-hand', '2-hand', 'shield', 'bow', 'crossbow'];

// 1×1 pixel PNG transparente (para fallback=empty)
const EMPTY_PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADElEQVR42mNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=', 'base64');

function sanitize(str, pattern) {
    return String(str || '').replace(pattern, '');
}

module.exports = async function handler(req, res) {
    // Apenas GET
    if (req.method !== 'GET') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    const { part, id, file, format, fallback } = req.query;

    // Validação
    const safePart = sanitize(part, /[^a-z0-9-]/gi);
    const safeId = parseInt(id, 10) || 0;
    const safeFile = sanitize(file, /[^a-z0-9_-]/gi);
    const safeFormat = format === 'png' ? 'png' : 'webp';
    const useFallback = fallback === 'empty';

    if (!safePart || safeId <= 0 || !safeFile || !ALLOWED_PARTS.includes(safePart)) {
        res.status(400).json({ error: 'Invalid parameters' });
        return;
    }

    // Fetch da wsdb.xyz
    const wsdbUrl = `https://wsdb.xyz/textures/${safePart}/${safeId}/${safeFile}.${safeFormat}`;

    try {
        const wsdbRes = await fetch(wsdbUrl, {
            signal: AbortSignal.timeout(12000),
            headers: { 'User-Agent': 'MercadoWarspear/1.0' }
        });

        if (!wsdbRes.ok) {
            if (useFallback) {
                res.status(200)
                    .setHeader('Content-Type', 'image/png')
                    .setHeader('Cache-Control', 'public, max-age=604800')
                    .send(EMPTY_PNG);
                return;
            }
            res.status(404).json({ error: 'Texture not found' });
            return;
        }

        const buffer = await wsdbRes.arrayBuffer();
        const contentType = wsdbRes.headers.get('content-type') || `image/${safeFormat}`;

        res.status(200)
            .setHeader('Content-Type', contentType)
            .setHeader('Cache-Control', 'public, max-age=604800, s-maxage=31536000')
            .setHeader('Content-Length', buffer.byteLength)
            .send(Buffer.from(buffer));
    } catch (err) {
        if (useFallback) {
            res.status(200)
                .setHeader('Content-Type', 'image/png')
                .setHeader('Cache-Control', 'public, max-age=604800')
                .send(EMPTY_PNG);
            return;
        }
        res.status(502).json({ error: 'Upstream fetch failed' });
    }
};
