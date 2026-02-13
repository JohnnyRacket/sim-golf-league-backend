import { SignJWT, jwtVerify, importJWK, createLocalJWKSet, type JWK } from 'jose';
import { db } from '../db';
import { JWTPayload } from '../types/auth';
import { buildEntityRoles } from './role-builder';

let cachedKeys: {
  publicKey: JWK;
  privateKey: JWK;
  importedPrivate: Uint8Array | CryptoKey;
  alg: string;
  fetchedAt: number;
} | null = null;

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getSigningKey() {
  if (cachedKeys && Date.now() - cachedKeys.fetchedAt < CACHE_TTL) {
    return cachedKeys;
  }

  const jwk = await (db as any)
    .selectFrom('jwks')
    .select(['public_key', 'private_key'])
    .orderBy('created_at', 'desc')
    .executeTakeFirstOrThrow();

  const publicKey: JWK = JSON.parse(jwk.public_key);
  const privateKey: JWK = JSON.parse(jwk.private_key);
  const alg = privateKey.alg || 'EdDSA';
  const importedPrivate = await importJWK(privateKey, alg);

  cachedKeys = { publicKey, privateKey, importedPrivate, alg, fetchedAt: Date.now() };
  return cachedKeys;
}

/**
 * Sign a Rich JWT with entity-scoped roles.
 * Used by compat routes (/auth/login, /auth/register, /auth/refresh).
 */
export async function signRichJWT(userId: string): Promise<{ token: string; payload: JWTPayload }> {
  const keys = await getSigningKey();

  const user = await db.selectFrom('users')
    .select(['id', 'username', 'email', 'role'])
    .where('id', '=', userId)
    .executeTakeFirstOrThrow();

  const roles = await buildEntityRoles(userId);

  const payload: JWTPayload = {
    id: user.id,
    username: user.username,
    email: user.email,
    platform_role: user.role,
    locations: roles.locations,
    leagues: roles.leagues,
    teams: roles.teams,
  };

  const token = await new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: keys.alg })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(keys.importedPrivate);

  return { token, payload };
}

/**
 * Build a JWKS verifier from the database keys.
 * Cached for performance.
 */
let cachedJWKS: { verifier: ReturnType<typeof createLocalJWKSet>; fetchedAt: number } | null = null;

export async function getJWKSVerifier() {
  if (cachedJWKS && Date.now() - cachedJWKS.fetchedAt < CACHE_TTL) {
    return cachedJWKS.verifier;
  }

  const jwkRows = await (db as any)
    .selectFrom('jwks')
    .select(['public_key'])
    .execute();

  const keys = jwkRows.map((row: any) => JSON.parse(row.public_key));
  const verifier = createLocalJWKSet({ keys });

  cachedJWKS = { verifier, fetchedAt: Date.now() };
  return verifier;
}

/**
 * Verify a JWT token and return the payload.
 * Used by auth middleware.
 */
export async function verifyRichJWT(token: string): Promise<JWTPayload> {
  const verifier = await getJWKSVerifier();
  const { payload } = await jwtVerify(token, verifier);
  return payload as unknown as JWTPayload;
}
