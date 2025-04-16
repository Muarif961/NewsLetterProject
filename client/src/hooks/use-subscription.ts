import { useState, useEffect } from 'react';

export interface Subscription {
  tier: string;
  subscriberLimit: number;
  currentSubscribers: number;
  hasReachedLimit: boolean;
  aiCreditsTotal: number;
  aiCreditsUsed: number;
  status: string;
  provider: string;
  activatedAt: string;
  metadata?: {
    trialEndsAt?: string;
    isTrialActive?: boolean | string;
    [key: string]: any;
  };
}

export function useSubscription() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchSubscription() {
      try {
        setIsLoading(true);
        const response = await fetch('/api/subscription/details');
        if (!response.ok) {
          throw new Error('Failed to fetch subscription details');
        }
        const data = await response.json();
        setSubscription(data);
      } catch (err: any) {
        console.error('Error fetching subscription:', err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setIsLoading(false);
      }
    }

    fetchSubscription();
  }, []);

  const openStripePortal = async (returnPath?: string) => {
    try {
      if (subscription?.provider !== 'stripe') {
        throw new Error('Stripe portal is only available for Stripe subscribers');
      }
      
      const response = await fetch('/api/subscription/portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          returnPath: returnPath || '/settings/billing'
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to create portal session');
      }
      
      const { url } = await response.json();
      
      // Open portal in a new tab instead of redirecting current page
      window.open(url, '_blank', 'noopener,noreferrer');
      return true;
    } catch (err) {
      console.error('Error opening Stripe portal:', err);
      throw err;
    }
  };

  const isOnTrial = Boolean(subscription?.metadata?.isTrialActive) && 
    (subscription?.metadata?.isTrialActive === true || 
     subscription?.metadata?.isTrialActive === 'true');

  const trialDaysRemaining = subscription?.metadata?.trialEndsAt 
    ? Math.max(0, Math.ceil(
        (new Date(subscription.metadata.trialEndsAt).getTime() - Date.now()) / 
        (1000 * 60 * 60 * 24)
      ))
    : 0;

  return {
    subscription,
    isLoading,
    error,
    openStripePortal,
    isOnTrial,
    trialDaysRemaining
  };
}
