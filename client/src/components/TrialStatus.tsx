
import React from 'react';
import { useSubscription } from '../hooks/use-subscription';
import { Card, CardContent } from './ui/card';
import { Clock, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';

export function TrialStatus() {
  const { subscription, isLoading } = useSubscription();
  
  if (isLoading || !subscription) return null;
  
  // Check if user is on trial
  const metadata = subscription.metadata || {};
  const trialEndsAt = metadata.trialEndsAt;
  const isTrialActive = metadata.isTrialActive === true || metadata.isTrialActive === 'true';
  
  if (!trialEndsAt || !isTrialActive) return null;
  
  // Calculate days remaining
  const trialEndDate = new Date(trialEndsAt);
  const today = new Date();
  const daysRemaining = Math.max(0, Math.ceil((trialEndDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
  
  // Determine display content based on days remaining
  const isEnding = daysRemaining <= 3;
  
  return (
    <Card className={`mb-4 ${isEnding ? 'border-orange-400 dark:border-orange-600' : 'border-blue-200 dark:border-blue-800'}`}>
      <CardContent className="p-4">
        <div className="flex items-center space-x-3">
          {isEnding ? (
            <AlertCircle className="h-5 w-5 text-orange-500" />
          ) : (
            <Clock className="h-5 w-5 text-blue-500" />
          )}
          <div>
            <p className="text-sm font-medium">
              {daysRemaining === 0 ? (
                "Your trial ends today!"
              ) : (
                `Trial Period: ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} remaining`
              )}
            </p>
            <p className="text-xs text-muted-foreground">
              Your trial ends on {trialEndDate.toLocaleDateString()}
            </p>
          </div>
        </div>
        
        {isEnding && (
          <div className="mt-3">
            <Button 
              variant="outline" 
              size="sm"
              className="w-full text-orange-600 border-orange-200 hover:bg-orange-50 dark:border-orange-800 dark:hover:bg-orange-950/30"
              onClick={() => window.location.href = '/settings/billing'}
            >
              Review Billing Information
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
