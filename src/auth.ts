import { betterAuth } from "better-auth";
import { jwt } from "better-auth/plugins";
import { Pool } from "pg";
import bcrypt from "bcrypt";
import { config } from "./utils/config";
import { buildEntityRoles } from "./services/role-builder";

const pool = new Pool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.name,
  max: 5,
});

export const auth = betterAuth({
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

  session: {
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
        disablePrivateKeyEncryption: true,
      },
      jwt: {
        expirationTime: "24h",
        definePayload: async ({ user }) => {
          const roles = await buildEntityRoles(user.id);
          return {
            id: user.id,
            username: (user as any).username || user.name,
            email: user.email,
            platform_role: (user as any).role || "user",
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
