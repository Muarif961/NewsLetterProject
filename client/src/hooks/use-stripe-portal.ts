import { useState } from 'react';
import { useToast } from './use-toast';

interface StripePortalOptions {
  returnPath?: string;
  provider?: string;
}

/**
 * Hook for interacting with the Stripe Customer Portal
 * Provides functions to open the portal in a new tab with proper error handling
 */
export function useStripePortal() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  /**
   * Opens the Stripe Customer Portal in a new tab
   * @param options Configuration options
   * @returns Promise resolving to true if successful
   */
  const openPortal = async (options: StripePortalOptions = {}) => {
    setIsLoading(true);
    
    try {
      console.log('Starting Stripe portal flow with return path:', options.returnPath);
      
      // Check subscription provider if provided
      if (options.provider && options.provider !== 'stripe') {
        console.error('Provider mismatch:', options.provider);
        throw new Error('Stripe portal is only available for Stripe subscribers');
      }
      
      console.log('Making portal API request...');
      const response = await fetch('/api/subscription/portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          returnPath: options.returnPath || '/settings?tab=billing'
        })
      });
      
      // Log detailed response info for debugging
      console.log('Portal API response status:', response.status);
      
      // Check response status
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Portal API error response:', errorText);
        
        let errorMessage = 'Failed to create portal session';
        try {
          // Try to parse error as JSON
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.message || errorMessage;
        } catch (e) {
          // If not JSON, use text as is
          if (errorText) errorMessage = errorText;
        }
        
        throw new Error(errorMessage);
      }
      
      // Parse response JSON
      const data = await response.json();
      console.log('Portal session created successfully');
      
      if (!data.url) {
        throw new Error('No portal URL returned from API');
      }
      
      // Open portal in a new tab instead of redirecting current page
      console.log('Opening portal URL in new tab');
      window.open(data.url, '_blank', 'noopener,noreferrer');
      
      // Show success toast
      toast({
        title: "Stripe Portal Opened",
        description: "Manage your subscription in the new tab",
        variant: "default",
      });
      
      return true;
    } catch (err: any) {
      console.error('Error opening Stripe portal:', err);
      
      // Show error toast
      toast({
        title: "Error Opening Portal",
        description: err?.message || "Failed to open Stripe customer portal",
        variant: "destructive",
      });
      
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    openPortal,
    isLoading
  };
}
