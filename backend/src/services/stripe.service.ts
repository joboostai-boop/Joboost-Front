import Stripe from 'stripe';
import { prisma } from '../db';
import { STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_ID, FRONTEND_URL } from '../config';

const stripe = new Stripe(STRIPE_SECRET_KEY);

interface SubscriptionStatus {
  isActive: boolean;
  status: string | null;
  endsAt: Date | null;
}

export const stripeService = {
  /**
   * Récupère ou crée un Customer Stripe pour un utilisateur donné
   */
  createOrGetCustomer: async (userId: string, email: string): Promise<string> => {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('Utilisateur introuvable');

    // Si un customer Stripe existe déjà, le retourner
    if (user.stripeCustomerId) {
      return user.stripeCustomerId;
    }

    // Créer un nouveau customer Stripe
    const customer = await stripe.customers.create({
      email,
      metadata: { userId },
    });

    // Sauvegarder l'ID en base
    await prisma.user.update({
      where: { id: userId },
      data: { stripeCustomerId: customer.id },
    });

    return customer.id;
  },

  /**
   * Crée une session Stripe Checkout pour l'abonnement mensuel
   */
  createCheckoutSession: async (userId: string, email: string): Promise<{ url: string }> => {
    const customerId = await stripeService.createOrGetCustomer(userId, email);

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
      success_url: `${FRONTEND_URL}/dashboard?payment=success`,
      cancel_url: `${FRONTEND_URL}/pricing?payment=canceled`,
      metadata: { userId },
    });

    if (!session.url) {
      throw new Error('Impossible de créer la session de paiement');
    }

    return { url: session.url };
  },

  /**
   * Traite les webhooks Stripe entrants
   */
  handleWebhookEvent: async (payload: Buffer, sig: string): Promise<{ received: true }> => {
    const event = stripe.webhooks.constructEvent(payload, sig, STRIPE_WEBHOOK_SECRET);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata?.userId;
        if (!userId) break;

        const subscriptionId = typeof session.subscription === 'string'
          ? session.subscription
          : session.subscription?.id;

        await prisma.user.update({
          where: { id: userId },
          data: {
            stripeSubscriptionId: subscriptionId ?? undefined,
            subscriptionStatus: 'active',
            plan: 'Pro',
          },
        });
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const customerId = typeof subscription.customer === 'string'
          ? subscription.customer
          : subscription.customer.id;

        const user = await prisma.user.findFirst({
          where: { stripeCustomerId: customerId },
        });
        if (!user) break;

        await prisma.user.update({
          where: { id: user.id },
          data: {
            subscriptionStatus: subscription.status,
            subscriptionEndsAt: subscription.items?.data?.[0]?.current_period_end
              ? new Date(subscription.items.data[0].current_period_end * 1000)
              : null,
          },
        });
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const customerId = typeof subscription.customer === 'string'
          ? subscription.customer
          : subscription.customer.id;

        const user = await prisma.user.findFirst({
          where: { stripeCustomerId: customerId },
        });
        if (!user) break;

        await prisma.user.update({
          where: { id: user.id },
          data: {
            subscriptionStatus: 'canceled',
            plan: 'Gratuit',
          },
        });
        break;
      }
    }

    return { received: true };
  },

  /**
   * Retourne le statut d'abonnement d'un utilisateur
   */
  getSubscriptionStatus: async (userId: string): Promise<SubscriptionStatus> => {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('Utilisateur introuvable');

    return {
      isActive: user.subscriptionStatus === 'active',
      status: user.subscriptionStatus,
      endsAt: user.subscriptionEndsAt,
    };
  },
};
