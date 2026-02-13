import { Kysely } from "kysely";
import { Database, SubscriptionTier } from "../../types/database";
import { SubscriptionsService } from "../subscriptions/subscriptions.service";
import { NotFoundError } from "../../utils/errors";

export class PaymentsService {
  private db: Kysely<Database>;
  private subscriptionsService: SubscriptionsService;

  constructor(db: Kysely<Database>) {
    this.db = db;
    this.subscriptionsService = new SubscriptionsService(db);
  }

  /**
   * Create a mock checkout session.
   * TODO: Replace with Stripe checkout.sessions.create()
   */
  async createCheckoutSession(
    ownerId: string,
    tier: SubscriptionTier,
  ): Promise<{ id: string; url: string }> {
    const owner = await this.db
      .selectFrom("owners")
      .select("id")
      .where("id", "=", ownerId)
      .executeTakeFirst();

    if (!owner) {
      throw new NotFoundError("Owner");
    }

    // TODO: Replace with real Stripe integration
    // const session = await stripe.checkout.sessions.create({
    //   customer: owner.payment_provider_customer_id,
    //   mode: 'subscription',
    //   line_items: [{ price: tierToPriceId(tier), quantity: 1 }],
    //   success_url: `${process.env.FRONTEND_URL}/settings/billing?success=true`,
    //   cancel_url: `${process.env.FRONTEND_URL}/settings/billing?cancelled=true`,
    // });

    return {
      id: `mock_session_${Date.now()}`,
      url: `https://checkout.example.com/mock/${ownerId}/${tier}`,
    };
  }

  /**
   * Handle a mock webhook event.
   * TODO: Replace with Stripe webhook signature verification and real event handling
   */
  async handleWebhook(event: {
    event_type: string;
    owner_id: string;
    tier?: SubscriptionTier;
    provider_customer_id?: string;
    provider_subscription_id?: string;
  }): Promise<void> {
    // TODO: Verify Stripe webhook signature
    // const sig = request.headers['stripe-signature'];
    // const event = stripe.webhooks.constructEvent(body, sig, webhookSecret);

    switch (event.event_type) {
      case "checkout.session.completed":
      case "customer.subscription.updated":
        if (event.tier) {
          await this.subscriptionsService.updateTier(
            event.owner_id,
            event.tier,
          );
        }
        if (event.provider_customer_id || event.provider_subscription_id) {
          await this.db
            .updateTable("owners")
            .set({
              payment_provider_customer_id:
                event.provider_customer_id ?? undefined,
              payment_provider_subscription_id:
                event.provider_subscription_id ?? undefined,
            })
            .where("id", "=", event.owner_id)
            .execute();
        }
        break;

      case "customer.subscription.deleted":
        // Downgrade to free
        await this.subscriptionsService.updateTier(event.owner_id, "free");
        break;
    }
  }

  /**
   * Get payment history for an owner.
   * TODO: Replace with Stripe charges.list() or invoices.list()
   */
  async getPaymentHistory(
    _ownerId: string,
  ): Promise<
    Array<{
      id: string;
      amount: number;
      currency: string;
      status: string;
      created_at: string;
    }>
  > {
    // TODO: Implement with Stripe
    // const charges = await stripe.charges.list({
    //   customer: owner.payment_provider_customer_id,
    //   limit: 25,
    // });
    return [];
  }

  /**
   * Cancel subscription for an owner.
   * TODO: Replace with Stripe subscription cancellation
   */
  async cancelSubscription(ownerId: string): Promise<void> {
    const owner = await this.db
      .selectFrom("owners")
      .select(["id", "payment_provider_subscription_id"])
      .where("id", "=", ownerId)
      .executeTakeFirst();

    if (!owner) {
      throw new NotFoundError("Owner");
    }

    // TODO: Cancel in Stripe
    // if (owner.payment_provider_subscription_id) {
    //   await stripe.subscriptions.cancel(owner.payment_provider_subscription_id);
    // }

    // Reset to free tier
    await this.subscriptionsService.updateTier(ownerId, "free");

    // Clear provider IDs
    await this.db
      .updateTable("owners")
      .set({
        payment_provider_customer_id: null,
        payment_provider_subscription_id: null,
      })
      .where("id", "=", ownerId)
      .execute();
  }
}
