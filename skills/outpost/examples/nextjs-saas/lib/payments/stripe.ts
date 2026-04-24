import Stripe from 'stripe';
import { redirect } from 'next/navigation';
import { Team } from '@/lib/db/schema';
import {
  getTeamByStripeCustomerId,
  getUser,
  updateTeamSubscription
} from '@/lib/db/queries';
import { publishEvent } from '@/lib/outpost';

/** Explicit opt-out of Stripe API (pricing uses placeholders; checkout/webhooks disabled). */
export function isStripeMockMode(): boolean {
  return process.env.STRIPE_MOCK === '1';
}

/**
 * Use placeholder catalog when Stripe is explicitly mocked, or in development
 * when no secret key is set (so `next dev` works without a Stripe account).
 * Production builds still require a real key or STRIPE_MOCK=1 for `/pricing`.
 */
export function useStripeCatalogMock(): boolean {
  if (isStripeMockMode()) return true;
  if (process.env.STRIPE_SECRET_KEY?.trim()) return false;
  return process.env.NODE_ENV !== 'production';
}

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  if (isStripeMockMode()) {
    throw new Error(
      'Stripe API is disabled (STRIPE_MOCK=1). Unset STRIPE_MOCK and set STRIPE_SECRET_KEY for checkout and webhooks.'
    );
  }
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    throw new Error(
      'STRIPE_SECRET_KEY is required for checkout and webhooks. For local UI without Stripe, set STRIPE_MOCK=1 or rely on dev catalog mock (see README).'
    );
  }
  if (!stripeClient) {
    stripeClient = new Stripe(key, {
      apiVersion: '2025-08-27.basil'
    });
  }
  return stripeClient;
}

type StripeProductSummary = {
  id: string;
  name: string;
  description: string | null;
  defaultPriceId: string | undefined;
};

type StripePriceSummary = {
  id: string;
  productId: string;
  unitAmount: number | null;
  currency: string;
  interval: string | undefined;
  trialPeriodDays: number | null | undefined;
};

function mockStripeProducts(): StripeProductSummary[] {
  return [
    {
      id: 'prod_mock_base',
      name: 'Base',
      description: 'Mock product (STRIPE_MOCK or dev without key)',
      defaultPriceId: 'price_mock_base'
    },
    {
      id: 'prod_mock_plus',
      name: 'Plus',
      description: 'Mock product (STRIPE_MOCK or dev without key)',
      defaultPriceId: 'price_mock_plus'
    }
  ];
}

function mockStripePrices(): StripePriceSummary[] {
  return [
    {
      id: 'price_mock_base',
      productId: 'prod_mock_base',
      unitAmount: 800,
      currency: 'usd',
      interval: 'month' as const,
      trialPeriodDays: 7
    },
    {
      id: 'price_mock_plus',
      productId: 'prod_mock_plus',
      unitAmount: 1200,
      currency: 'usd',
      interval: 'month' as const,
      trialPeriodDays: 7
    }
  ];
}

export async function createCheckoutSession({
  team,
  priceId
}: {
  team: Team | null;
  priceId: string;
}) {
  if (isStripeMockMode() || !process.env.STRIPE_SECRET_KEY?.trim()) {
    redirect('/dashboard?notice=stripe-disabled');
  }

  const user = await getUser();
  const stripe = getStripe();

  if (!team || !user) {
    redirect(`/sign-up?redirect=checkout&priceId=${priceId}`);
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1
      }
    ],
    mode: 'subscription',
    success_url: `${process.env.BASE_URL}/api/stripe/checkout?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.BASE_URL}/pricing`,
    customer: team.stripeCustomerId || undefined,
    client_reference_id: user.id.toString(),
    allow_promotion_codes: true,
    subscription_data: {
      trial_period_days: 14
    }
  });

  redirect(session.url!);
}

export async function createCustomerPortalSession(team: Team) {
  if (isStripeMockMode() || !process.env.STRIPE_SECRET_KEY?.trim()) {
    redirect('/dashboard?notice=stripe-disabled');
  }

  const stripe = getStripe();

  if (!team.stripeCustomerId || !team.stripeProductId) {
    redirect('/pricing');
  }

  let configuration: Stripe.BillingPortal.Configuration;
  const configurations = await stripe.billingPortal.configurations.list();

  if (configurations.data.length > 0) {
    configuration = configurations.data[0];
  } else {
    const product = await stripe.products.retrieve(team.stripeProductId);
    if (!product.active) {
      throw new Error("Team's product is not active in Stripe");
    }

    const prices = await stripe.prices.list({
      product: product.id,
      active: true
    });
    if (prices.data.length === 0) {
      throw new Error("No active prices found for the team's product");
    }

    configuration = await stripe.billingPortal.configurations.create({
      business_profile: {
        headline: 'Manage your subscription'
      },
      features: {
        subscription_update: {
          enabled: true,
          default_allowed_updates: ['price', 'quantity', 'promotion_code'],
          proration_behavior: 'create_prorations',
          products: [
            {
              product: product.id,
              prices: prices.data.map((price) => price.id)
            }
          ]
        },
        subscription_cancel: {
          enabled: true,
          mode: 'at_period_end',
          cancellation_reason: {
            enabled: true,
            options: [
              'too_expensive',
              'missing_features',
              'switched_service',
              'unused',
              'other'
            ]
          }
        },
        payment_method_update: {
          enabled: true
        }
      }
    });
  }

  return stripe.billingPortal.sessions.create({
    customer: team.stripeCustomerId,
    return_url: `${process.env.BASE_URL}/dashboard`,
    configuration: configuration.id
  });
}

export async function handleSubscriptionChange(
  subscription: Stripe.Subscription
) {
  const customerId = subscription.customer as string;
  const subscriptionId = subscription.id;
  const status = subscription.status;

  const team = await getTeamByStripeCustomerId(customerId);

  if (!team) {
    console.error('Team not found for Stripe customer:', customerId);
    return;
  }

  let planName: string | null = null;

  if (status === 'active' || status === 'trialing') {
    const plan = subscription.items.data[0]?.plan;
    planName = (plan?.product as Stripe.Product).name ?? null;
    await updateTeamSubscription(team.id, {
      stripeSubscriptionId: subscriptionId,
      stripeProductId: plan?.product as string,
      planName,
      subscriptionStatus: status
    });
  } else if (status === 'canceled' || status === 'unpaid') {
    await updateTeamSubscription(team.id, {
      stripeSubscriptionId: null,
      stripeProductId: null,
      planName: null,
      subscriptionStatus: status
    });
  }

  // Notify subscribers that the team's subscription changed.
  // Topic: subscription.updated  (add to Outpost project if not present)
  await publishEvent(team.id, 'subscription.updated', {
    teamId: team.id,
    status,
    planName,
    subscriptionId,
  });
}

export async function getStripePrices(): Promise<StripePriceSummary[]> {
  if (useStripeCatalogMock()) {
    return mockStripePrices();
  }

  const stripe = getStripe();
  const prices = await stripe.prices.list({
    expand: ['data.product'],
    active: true,
    type: 'recurring'
  });

  return prices.data.map((price) => ({
    id: price.id,
    productId:
      typeof price.product === 'string' ? price.product : price.product.id,
    unitAmount: price.unit_amount,
    currency: price.currency,
    interval: price.recurring?.interval,
    trialPeriodDays: price.recurring?.trial_period_days
  }));
}

export async function getStripeProducts(): Promise<StripeProductSummary[]> {
  if (useStripeCatalogMock()) {
    return mockStripeProducts();
  }

  const stripe = getStripe();
  const products = await stripe.products.list({
    active: true,
    expand: ['data.default_price']
  });

  return products.data.map((product) => ({
    id: product.id,
    name: product.name,
    description: product.description,
    defaultPriceId:
      typeof product.default_price === 'string'
        ? product.default_price
        : product.default_price?.id
  }));
}
