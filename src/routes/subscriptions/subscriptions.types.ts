import { Static, Type } from "@sinclair/typebox";

export const tierLimitsSchema = Type.Object({
  tier: Type.String(),
  max_locations: Type.Integer(),
  max_leagues_per_location: Type.Integer(),
  price_monthly: Type.Union([Type.Number(), Type.Null()]),
  features: Type.Array(Type.String()),
});

export const subscriptionInfoSchema = Type.Object({
  owner_id: Type.String({ format: "uuid" }),
  owner_name: Type.String(),
  subscription_tier: Type.String(),
  subscription_status: Type.String(),
  subscription_expires_at: Type.Union([
    Type.String({ format: "date-time" }),
    Type.Null(),
  ]),
  max_locations: Type.Integer(),
  max_leagues_per_location: Type.Integer(),
  current_locations: Type.Integer(),
  current_leagues: Type.Integer(),
});

export const updateTierSchema = Type.Object({
  tier: Type.Union([
    Type.Literal("free"),
    Type.Literal("starter"),
    Type.Literal("pro"),
    Type.Literal("enterprise"),
  ]),
});

export const errorResponseSchema = Type.Object({
  error: Type.String(),
});

export const successMessageSchema = Type.Object({
  message: Type.String(),
});

export type UpdateTierBody = Static<typeof updateTierSchema>;

// Tier definitions (placeholder pricing)
export const TIER_LIMITS = {
  free: {
    max_locations: 1,
    max_leagues_per_location: 2,
    price_monthly: null,
    features: ["Basic league management", "Up to 8 teams per league"],
  },
  starter: {
    max_locations: 3,
    max_leagues_per_location: 5,
    price_monthly: 29.99,
    features: [
      "Multiple locations",
      "Custom branding",
      "Email notifications",
      "Priority support",
    ],
  },
  pro: {
    max_locations: 10,
    max_leagues_per_location: 20,
    price_monthly: 79.99,
    features: [
      "Advanced analytics",
      "API access",
      "Handicap tracking",
      "Custom integrations",
    ],
  },
  enterprise: {
    max_locations: -1, // unlimited
    max_leagues_per_location: -1,
    price_monthly: null, // custom pricing
    features: [
      "Unlimited locations",
      "Unlimited leagues",
      "Dedicated support",
      "SLA guarantee",
      "Custom features",
    ],
  },
} as const;
