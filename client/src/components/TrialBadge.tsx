import React from 'react';
import { Sparkles } from 'lucide-react';
import { useSubscription } from '../hooks/use-subscription';

/**
 * A component to display the trial badge for subscription plans.
 * Only shows for Stripe subscribers during trial period.
 * 
 * @returns {JSX.Element} The trial badge component.
 */
export function TrialBadge() {
  const { subscription, isOnTrial } = useSubscription();
  
  // Only show the trial badge for Stripe subscribers during trial period
  if (!subscription || subscription.provider !== 'stripe' || !isOnTrial) {
    return null;
  }
  
  return (
    <div className="mb-4 flex items-center justify-center px-3 py-2 rounded-md bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border border-green-200 dark:border-green-800">
      <Sparkles className="h-5 w-5 mr-2 text-green-600 dark:text-green-400" />
      <span className="text-sm font-medium text-green-700 dark:text-green-400">
        Start with a 14-day free trial
      </span>
    </div>
  );
}

/**
 * A component to display trial status for subscriptions.
 * 
 * @returns {JSX.Element} The trial status component.
 */
export function TrialStatus() {
  const { subscription, isOnTrial, trialDaysRemaining } = useSubscription();
  
  // Only show for Stripe subscribers on active trial
  if (!subscription || subscription.provider !== 'stripe' || !isOnTrial || !subscription.metadata?.trialEndsAt) {
    return null;
  }
  
  return (
    <div className="p-4 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 mb-6">
      <div className="flex items-center space-x-3">
        <div>
          <p className="font-medium">
            Trial Period: {trialDaysRemaining} days remaining
          </p>
          <p className="text-sm text-muted-foreground">
            Your trial ends on {new Date(subscription.metadata.trialEndsAt).toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * A component to welcome new trial users to the dashboard.
 * 
 * @param {Object} props Component properties.
 * @param {Function} props.onCreateNewsletter Callback when user wants to create a newsletter.
 * @returns {JSX.Element} The welcome message component.
 */
export function TrialWelcomeMessage({ onCreateNewsletter }: { onCreateNewsletter: () => void }) {
  const { subscription, isOnTrial } = useSubscription();
  
  // Only show for Stripe subscribers on active trial
  if (!subscription || subscription.provider !== 'stripe' || !isOnTrial) {
    return null;
  }
  
  return (
    <div className="p-6 mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
      <h2 className="text-xl font-semibold mb-2">Welcome to your free trial!</h2>
      <p className="text-muted-foreground mb-4">
        You're all set with your 14-day free trial. Explore all premium features 
        and start creating amazing newsletters.
      </p>
      <button 
        className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
        onClick={onCreateNewsletter}
      >
        Create Your First Newsletter
      </button>
    </div>
  );
}
