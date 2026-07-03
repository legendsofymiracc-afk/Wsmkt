/**
 * api/texture.js — Vercel Serverless Function (Node.js)
 * Proxy de texturas WSDB — mesma origem evita CORS no Canvas.
 */
const https = require('https');

const ALLOWED = new Set(['head','body','hands','legs','hair','helmet','ears','cape','1-hand','2-hand','shield','bow','crossbow']);

// 1x1 pixel PNG transparente
const EMPTY_PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADElEQVR42mNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=', 'base64');

function sanitize(str, re) {
    return String(str || '').replace(re, '');
}

module.exports = function handler(req, res) {
    if (req.method !== 'GET') {
        res.writeHead(405, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Method not allowed' }));
        return;
    }

    const q = req.query || {};
    const part = sanitize(q.part, /[^a-z0-9-]/gi);
    const id = parseInt(q.id, 10) || 0;
    const file = sanitize(q.file, /[^a-z0-9_-]/gi);
    const fmt = q.format === 'png' ? 'png' : 'webp';
    const useFallback = q.fallback === 'empty';

    if (!part || id <= 0 || !file || !ALLOWED.has(part)) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid parameters' }));
        return;
    }

    const upstreamPath = `/textures/${part}/${id}/${file}.${fmt}`;

    const upstream = https.get({
        hostname: 'wsdb.xyz',
        path: upstreamPath,
        timeout: 12000,
        headers: { 'User-Agent': 'MercadoWarspear/1.0' }
    }, (upstreamRes) => {
        if (upstreamRes.statusCode !== 200) {
            if (useFallback) {
                res.writeHead(200, {
                    'Content-Type': 'image/png',
                    'Cache-Control': 'public, max-age=604800'
                });
                res.end(EMPTY_PNG);
                return;
            }
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Texture not found' }));
            return;
        }

        const contentType = upstreamRes.headers['content-type'] || `image/${fmt}`;
        res.writeHead(200, {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=604800, s-maxage=31536000'
        });
        upstreamRes.pipe(res);
    });

    upstream.on('error', () => {
        if (useFallback) {
            res.writeHead(200, {
                'Content-Type': 'image/png',
                'Cache-Control': 'public, max-age=604800'
            });
            res.end(EMPTY_PNG);
            return;
        }
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Upstream fetch failed' }));
    });

    upstream.on('timeout', () => {
        upstream.destroy();
        if (useFallback) {
            res.writeHead(200, {
                'Content-Type': 'image/png',
                'Cache-Control': 'public, max-age=604800'
            });
            res.end(EMPTY_PNG);
        } else {
            res.writeHead(504, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Upstream timeout' }));
        }
    });
};
