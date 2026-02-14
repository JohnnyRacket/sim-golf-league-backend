import pg from "pg";
const { Pool } = pg;
import bcrypt from "bcrypt";
import { betterAuth } from "better-auth";
import { jwt } from "better-auth/plugins";
import { config } from "./utils/config";
import { buildEntityRoles } from "./services/role-builder";

let _auth: any = null;

/**
 * Lazily create and return the better-auth instance.
 */
export async function getAuth() {
  if (_auth) return _auth;

  const pool = new Pool({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    database: config.db.name,
    max: 5,
  });

  _auth = betterAuth({
    database: pool,
    secret: config.authSecret,
    baseURL: config.appUrl,
    basePath: "/api/auth",

    user: {
      modelName: "users",
      fields: {
        name: "username",
        image: "avatar_url",
        emailVerified: "email_verified",
        createdAt: "created_at",
        updatedAt: "updated_at",
      },
      additionalFields: {
        role: {
          type: "string",
          defaultValue: "user",
          input: false,
        },
        first_name: { type: "string", required: false },
        last_name: { type: "string", required: false },
        phone: { type: "string", required: false },
      },
    },

    // Stateless sessions - no DB queries for session validation
    session: {
      cookieCache: {
        enabled: true,
        maxAge: 900, // 15 minutes (short-lived for security)
        strategy: "jwt", // JWT strategy for stateless cookies
        refreshCache: false, // No auto-refresh
      },
      expiresIn: 60 * 60 * 24, // 24 hours
      fields: {
        expiresAt: "expires_at",
        createdAt: "created_at",
        updatedAt: "updated_at",
        ipAddress: "ip_address",
        userAgent: "user_agent",
        userId: "user_id",
        token: "token",
      },
    },

    account: {
      modelName: "account",
      fields: {
        accountId: "account_id",
        providerId: "provider_id",
        userId: "user_id",
        accessToken: "access_token",
        refreshToken: "refresh_token",
        idToken: "id_token",
        accessTokenExpiresAt: "access_token_expires_at",
        refreshTokenExpiresAt: "refresh_token_expires_at",
        scope: "scope",
        password: "password",
        createdAt: "created_at",
        updatedAt: "updated_at",
      },
    },

    verification: {
      fields: {
        identifier: "identifier",
        value: "value",
        expiresAt: "expires_at",
        createdAt: "created_at",
        updatedAt: "updated_at",
      },
    },

    emailAndPassword: {
      enabled: true,
      password: {
        hash: (password: string) => bcrypt.hash(password, 10),
        verify: ({ hash, password }: { hash: string; password: string }) =>
          bcrypt.compare(password, hash),
      },
    },

    socialProviders: {
      ...(config.googleClientId && config.googleClientSecret
        ? {
            google: {
              clientId: config.googleClientId,
              clientSecret: config.googleClientSecret,
            },
          }
        : {}),
      ...(config.appleClientId && config.appleClientSecret
        ? {
            apple: {
              clientId: config.appleClientId,
              clientSecret: config.appleClientSecret,
            },
          }
        : {}),
    },

    plugins: [
      jwt({
        jwks: {
          // Enable private key encryption for security (removed disablePrivateKeyEncryption)
          // Key rotation for security best practices
          rotationInterval: 60 * 60 * 24 * 30, // 30 days
          gracePeriod: 60 * 60 * 24 * 30,      // 30 days grace period
        },
        jwt: {
          expirationTime: "24h",
          definePayload: async ({ user }: { user: any }) => {
            const roles = await buildEntityRoles(user.id);
            return {
              id: user.id,
              username: user.username || user.name,
              email: user.email,
              platform_role: user.role || "user",
              locations: roles.locations,
              leagues: roles.leagues,
              teams: roles.teams,
            };
          },
        },
        schema: {
          jwks: {
            fields: {
              publicKey: "public_key",
              privateKey: "private_key",
              createdAt: "created_at",
            },
          },
        },
      }),
    ],

    trustedOrigins: Array.isArray(config.corsOrigins)
      ? config.corsOrigins
      : [],
  });

  return _auth;
}
