import { FastifyInstance } from "fastify";
import { db } from "../../db";
import { checkPlatformRole } from "../../middleware/auth";
import { PaymentsService } from "./payments.service";
import { AuditService } from "../../services/audit.service";
import {
  checkoutSchema,
  webhookSchema,
  checkoutResponseSchema,
  paymentHistoryItemSchema,
  errorResponseSchema,
  successMessageSchema,
  CheckoutBody,
  WebhookBody,
} from "./payments.types";

export async function paymentRoutes(fastify: FastifyInstance) {
  const paymentsService = new PaymentsService(db);
  const auditService = new AuditService(db);

  // Create checkout session (owner only)
  fastify.post<{ Body: CheckoutBody }>(
    "/checkout",
    {
      preHandler: checkPlatformRole(["owner"]),
      schema: {
        body: checkoutSchema,
        response: {
          200: checkoutResponseSchema,
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

      const session = await paymentsService.createCheckoutSession(
        owner.id,
        request.body.tier,
      );

      return session;
    },
  );

  // Mock webhook handler
  fastify.post<{ Body: WebhookBody }>(
    "/webhook",
    {
      schema: {
        body: webhookSchema,
        response: {
          200: successMessageSchema,
          500: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      // TODO: In production, verify webhook signature instead of open access
      await paymentsService.handleWebhook(request.body);

      auditService.log({
        user_id: null,
        action: "payment.webhook",
        entity_type: "owner",
        entity_id: request.body.owner_id,
        details: {
          event_type: request.body.event_type,
          tier: request.body.tier,
        },
        ip_address: request.ip,
      });

      reply.send({ message: "Webhook processed" });
    },
  );

  // Get payment history (owner only)
  fastify.get(
    "/history",
    {
      preHandler: checkPlatformRole(["owner"]),
      schema: {
        response: {
          200: { type: "array", items: paymentHistoryItemSchema },
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

      return paymentsService.getPaymentHistory(owner.id);
    },
  );

  // Cancel subscription (owner only)
  fastify.post(
    "/cancel",
    {
      preHandler: checkPlatformRole(["owner"]),
      schema: {
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

      await paymentsService.cancelSubscription(owner.id);

      auditService.log({
        user_id: userId,
        action: "payment.cancel",
        entity_type: "owner",
        entity_id: owner.id,
        ip_address: request.ip,
      });

      reply.send({ message: "Subscription cancelled, reverted to free tier" });
    },
  );
}
