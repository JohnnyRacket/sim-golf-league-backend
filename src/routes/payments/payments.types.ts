export interface CheckoutBody {
  tier: "starter" | "pro" | "enterprise";
}

export interface WebhookBody {
  event_type: string;
  owner_id: string;
  tier?: "free" | "starter" | "pro" | "enterprise";
  provider_customer_id?: string;
  provider_subscription_id?: string;
}

export const checkoutSchema = {
  type: "object",
  properties: {
    tier: {
      type: "string",
      enum: ["starter", "pro", "enterprise"],
    },
  },
  required: ["tier"],
};

export const webhookSchema = {
  type: "object",
  properties: {
    event_type: { type: "string" },
    owner_id: { type: "string", format: "uuid" },
    tier: {
      type: "string",
      enum: ["free", "starter", "pro", "enterprise"],
    },
    provider_customer_id: { type: "string" },
    provider_subscription_id: { type: "string" },
  },
  required: ["event_type", "owner_id"],
};

export const checkoutResponseSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    url: { type: "string" },
  },
};

export const paymentHistoryItemSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    amount: { type: "number" },
    currency: { type: "string" },
    status: { type: "string" },
    created_at: { type: "string", format: "date-time" },
  },
};

export const errorResponseSchema = {
  type: "object",
  properties: {
    error: { type: "string" },
  },
};

export const successMessageSchema = {
  type: "object",
  properties: {
    message: { type: "string" },
  },
};
