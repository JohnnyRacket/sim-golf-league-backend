import { FastifyInstance } from "fastify";
import { db } from "../../db";
import { checkPlatformRole } from "../../middleware/auth";
import { SubscriptionsService } from "./subscriptions.service";
import {
  tierLimitsSchema,
  subscriptionInfoSchema,
  updateTierSchema,
  errorResponseSchema,
  successMessageSchema,
  UpdateTierBody,
} from "./subscriptions.types";

export async function subscriptionRoutes(fastify: FastifyInstance) {
  const subscriptionsService = new SubscriptionsService(db);

  // Get available tier plans (public within auth scope)
  fastify.get(
    "/plans",
    {
      schema: {
        response: {
          200: { type: "array", items: tierLimitsSchema },
          500: errorResponseSchema,
        },
      },
    },
    async () => {
      return subscriptionsService.getTierPlans();
    },
  );

  // Get current user's subscription info (must be an owner)
  fastify.get(
    "/my",
    {
      preHandler: checkPlatformRole(["owner"]),
      schema: {
        response: {
          200: subscriptionInfoSchema,
          404: errorResponseSchema,
          500: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const userId = request.user.id.toString();

      // Find owner by user_id
      const owner = await db
        .selectFrom("owners")
        .select("id")
        .where("user_id", "=", userId)
        .executeTakeFirst();

      if (!owner) {
        reply.code(404).send({ error: "Owner profile not found" });
        return;
      }

      return subscriptionsService.getSubscriptionInfo(owner.id);
    },
  );

  // Update subscription tier (placeholder - just changes tier, no payment)
  fastify.put<{ Body: UpdateTierBody }>(
    "/my/tier",
    {
      preHandler: checkPlatformRole(["owner"]),
      schema: {
        body: updateTierSchema,
        response: {
          200: successMessageSchema,
          404: errorResponseSchema,
          500: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const userId = request.user.id.toString();

      const owner = await db
        .selectFrom("owners")
        .select("id")
        .where("user_id", "=", userId)
        .executeTakeFirst();

      if (!owner) {
        reply.code(404).send({ error: "Owner profile not found" });
        return;
      }

      await subscriptionsService.updateTier(owner.id, request.body.tier);

      reply.send({ message: `Subscription updated to ${request.body.tier}` });
    },
  );
}
