/**
 * Verify Supabase-issued JWT for API auth.
 * Works in both Express (local) and Vercel serverless.
 * Tries JWKS (RS256) first, then JWT secret (HS256) for legacy Supabase projects.
 * Returns { sub, email } or null.
 */
import jwksClient from 'jwks-rsa';
import jwt from 'jsonwebtoken';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const jwtSecret = process.env.SUPABASE_JWT_SECRET || process.env.JWT_SECRET;
if (!supabaseUrl) {
  console.warn('VITE_SUPABASE_URL not set; JWT verification will fail');
}

const issuer = supabaseUrl ? `${supabaseUrl.replace(/\/$/, '')}/auth/v1` : undefined;
const jwksUri = supabaseUrl ? `${supabaseUrl.replace(/\/$/, '')}/auth/v1/.well-known/jwks.json` : '';

const client = jwksUri
  ? jwksClient({
      jwksUri,
      cache: true,
      cacheMaxAge: 600000,
      rateLimit: true,
    })
  : null;

function getAuthorizationHeader(req) {
  const headers = req.headers || {};
  return headers.authorization || headers.Authorization || '';
}

function extractPayload(decoded) {
  const sub = decoded?.sub;
  const email = decoded?.email ?? decoded?.user_email ?? null;
  if (!sub) return null;
  return { sub, email };
}

export async function verifyJwt(req) {
  const authHeader = getAuthorizationHeader(req);
  if (!authHeader || typeof authHeader !== 'string') return null;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  const token = match ? match[1].trim() : null;
  if (!token) return null;

  // 1) Try JWKS (RS256 / ES256) for projects using asymmetric signing
  if (client) {
    try {
      const decoded = await new Promise((resolve, reject) => {
        jwt.verify(
          token,
          (header, callback) => {
            if (!header?.kid) return callback(new Error('No kid'));
            client.getSigningKey(header.kid, (err, key) => {
              if (err) return callback(err);
              if (!key) return callback(new Error('No signing key'));
              const publicKey = key.publicKey || (typeof key.getPublicKey === 'function' ? key.getPublicKey() : null);
              if (!publicKey) return callback(new Error('No public key'));
              callback(null, publicKey);
            });
          },
          { algorithms: ['RS256', 'ES256'], issuer },
          (err, decoded) => (err ? reject(err) : resolve(decoded))
        );
      });
      const payload = extractPayload(decoded);
      if (payload) return payload;
    } catch (_) {
      // Fall through to JWT secret
    }
  }

  // 2) Fallback: HS256 with JWT secret (legacy Supabase; Dashboard > Project Settings > API > JWT Secret)
  if (jwtSecret) {
    try {
      const decoded = jwt.verify(token, jwtSecret, { algorithms: ['HS256'], issuer });
      return extractPayload(decoded);
    } catch (_) {
      // ignore
    }
  }

  return null;
}
