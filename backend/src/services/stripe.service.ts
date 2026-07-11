import Stripe from 'stripe';
import { prisma } from '../db';
import { STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_ID, FRONTEND_URL } from '../config';

const stripe = new Stripe(STRIPE_SECRET_KEY);

interface SubscriptionStatus {
  isActive: boolean;
  status: string | null;
  endsAt: Date | null;
}

// Correspondance montant HT payé (en centimes) -> candidatures créditées (packs).
// Sert quand le Payment Link n'a pas de metadata "grant_credits".
const PACK_CREDITS_BY_AMOUNT: { amount: number; credits: number }[] = [
  { amount: 799, credits: 10 },   // Pack Découverte 7,99 €
  { amount: 1999, credits: 30 },  // Pack Booster 19,99 €
  { amount: 4999, credits: 100 }, // Pack Marathon 49,99 €
];

function creditsForAmount(amount: number | null | undefined): number {
  if (amount == null) return 0;
  const match = PACK_CREDITS_BY_AMOUNT.find((p) => Math.abs(p.amount - amount) <= 2);
  return match ? match.credits : 0;
}

// Plans de l'espace recruteur (abonnement mensuel, montants en centimes d'euro).
// Créés dynamiquement via price_data : AUCUN produit à configurer dans le dashboard Stripe.
export const BUSINESS_PLANS: Record<string, { label: string; amount: number }> = {
  essentiel: { label: 'Business Essentiel', amount: 7900 },  // 79 €/mois
  pro: { label: 'Business Pro', amount: 19900 },             // 199 €/mois
};

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
   * Crée une session Checkout pour un abonnement de l'espace recruteur.
   * Le prix est défini inline (price_data) → rien à créer côté dashboard Stripe.
   */
  createBusinessCheckoutSession: async (userId: string, email: string, planKey: string): Promise<{ url: string }> => {
    const plan = BUSINESS_PLANS[planKey];
    if (!plan) throw new Error('Plan inconnu.');

    const customerId = await stripeService.createOrGetCustomer(userId, email);

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'eur',
            unit_amount: plan.amount,
            recurring: { interval: 'month' },
            product_data: {
              name: `Joboost ${plan.label}`,
              description: 'Abonnement mensuel — espace recruteur Joboost',
            },
          },
        },
      ],
      success_url: `${FRONTEND_URL}/business/billing?payment=success`,
      cancel_url: `${FRONTEND_URL}/business/billing?payment=canceled`,
      metadata: { userId, businessPlan: planKey },
    });

    if (!session.url) throw new Error('Impossible de créer la session de paiement');
    return { url: session.url };
  },

  /**
   * Portail client Stripe : le recruteur gère lui-même sa carte, ses factures
   * et la résiliation. Nécessite un customer Stripe existant.
   */
  createBillingPortalSession: async (userId: string): Promise<{ url: string }> => {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.stripeCustomerId) {
      throw new Error("Aucun abonnement Stripe n'est associé à ce compte.");
    }
    const portal = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${FRONTEND_URL}/business/billing`,
    });
    return { url: portal.url };
  },

  /**
   * Traite les webhooks Stripe entrants
   */
  handleWebhookEvent: async (payload: Buffer, sig: string): Promise<{ received: true }> => {
    const event = stripe.webhooks.constructEvent(payload, sig, STRIPE_WEBHOOK_SECRET);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        // L'utilisateur vient soit du checkout interne (metadata.userId),
        // soit d'un Payment Link (client_reference_id passé dans l'URL).
        const userId = session.metadata?.userId || session.client_reference_id || undefined;
        if (!userId) break;

        // Vérifier que l'utilisateur existe (le client_reference_id vient de l'URL, donc non fiable a priori)
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
          console.warn(`Stripe webhook: utilisateur ${userId} introuvable (session ${session.id})`);
          break;
        }

        const customerId = typeof session.customer === 'string'
          ? session.customer
          : session.customer?.id;

        if (session.mode === 'subscription') {
          // Abonnement : Élite candidat (checkout/Payment Link) OU plan Business
          // (metadata.businessPlan posée par createBusinessCheckoutSession).
          const subscriptionId = typeof session.subscription === 'string'
            ? session.subscription
            : session.subscription?.id;

          const businessPlanKey = session.metadata?.businessPlan;
          const planLabel = businessPlanKey
            ? (BUSINESS_PLANS[businessPlanKey]?.label ?? 'Business Essentiel')
            : 'Pro';

          await prisma.user.update({
            where: { id: userId },
            data: {
              // On persiste le customerId (utile pour les Payment Links : le client est nouveau)
              ...(customerId ? { stripeCustomerId: customerId } : {}),
              stripeSubscriptionId: subscriptionId ?? undefined,
              subscriptionStatus: 'active',
              plan: planLabel,
            },
          });
        } else if (session.mode === 'payment') {
          // Achat ponctuel = pack de crédits.
          // 1) Si une metadata "grant_credits" est présente (Payment Link/API), on l'utilise.
          // 2) Sinon, on déduit le nombre de crédits du MONTANT HT payé (amount_subtotal,
          //    avant taxes/remises) → robuste sans config metadata côté Stripe.
          let granted = parseInt(session.metadata?.grant_credits || '', 10);
          if (Number.isNaN(granted) || granted <= 0) {
            granted = creditsForAmount(session.amount_subtotal ?? session.amount_total);
          }
          if (granted > 0) {
            await prisma.user.update({
              where: { id: userId },
              data: { credits: { increment: granted } },
            });
          } else {
            console.warn(`Stripe webhook: pack non reconnu (session ${session.id}, subtotal ${session.amount_subtotal})`);
          }
        }
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
            // Un recruteur résilié retombe sur la période de découverte, un candidat sur Gratuit.
            plan: user.role === 'BUSINESS_PARTNER' ? 'Essai' : 'Gratuit',
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
