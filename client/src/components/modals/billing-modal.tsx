import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog"
import { Button } from "../ui/button"
import { motion, AnimatePresence } from "framer-motion"
import { CreditCard, Check, Coins, Users, Star, AlertCircle, ExternalLink } from "lucide-react"
import { Progress } from "../ui/progress"
import { useState, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { Card } from "../ui/card"
import { TrialStatus } from "../TrialBadge"
import { useSubscription } from "@/hooks/use-subscription"

const MotionCard = motion(Card)

interface SubscriptionDetails {
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

interface CreditPurchase {
  id: number;
  packageId: string;
  creditsAmount: number;
  pricePaid: number;
  currency: string;
  status: string;
  createdAt: string;
  completedAt: string | null;
}

interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
  currency: string;
  description: string;
}

const creditPackages: CreditPackage[] = [
  {
    id: "credits-100",
    name: "Starter Pack",
    credits: 100,
    price: 10,
    currency: "USD",
    description: "Perfect for small projects and testing"
  },
  {
    id: "credits-300",
    name: "Growth Pack",
    credits: 300,
    price: 25,
    currency: "USD",
    description: "Ideal for regular content creation"
  },
  {
    id: "credits-1000",
    name: "Professional Pack",
    credits: 1000,
    price: 75,
    currency: "USD",
    description: "Best value for power users"
  }
];

export function BillingModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [details, setDetails] = useState<SubscriptionDetails | null>(null);
  const [purchases, setPurchases] = useState<CreditPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchaseLoading, setPurchaseLoading] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const { toast } = useToast();
  const { subscription, isOnTrial, openStripePortal } = useSubscription();

  useEffect(() => {
    if (open) {
      fetchSubscriptionDetails();
      fetchPurchaseHistory();
    }
  }, [open]);

  const fetchSubscriptionDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/subscription/details");
      if (!response.ok) throw new Error("Failed to fetch subscription details");
      const data = await response.json();
      setDetails(data);
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Failed to load subscription details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPurchaseHistory = async () => {
    try {
      const response = await fetch("/api/credits/history");
      if (!response.ok) throw new Error("Failed to fetch purchase history");
      const data = await response.json();
      setPurchases(data);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const handlePurchase = async (packageId: string) => {
    try {
      setPurchaseLoading(packageId);
      const response = await fetch("/api/credits/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId }),
      });

      if (!response.ok) throw new Error("Failed to create checkout session");
      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error("Purchase error:", error);
      toast({
        title: "Error",
        description: "Failed to initiate purchase",
        variant: "destructive",
      });
    } finally {
      setPurchaseLoading(null);
    }
  };

  const handleOpenStripePortal = async () => {
    try {
      // Open the Stripe portal in a new tab with a return path to the billing page
      await openStripePortal('/settings?tab=billing');
      toast({
        title: "Stripe Portal Opened",
        description: "Manage your subscription in the new tab",
        variant: "default",
      });
    } catch (error) {
      console.error("Portal error:", error);
      toast({
        title: "Error",
        description: "Failed to open Stripe customer portal",
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <Check className="h-4 w-4 text-green-500" />;
      case "pending":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case "failed":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  // Check if provider is stripe
  const isStripeSubscription = details?.provider === 'stripe';
  
  // Check if provider is appsumo
  const isAppSumoSubscription = details?.provider === 'appsumo';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Billing & Subscription</DialogTitle>
        </DialogHeader>
        
        {/* Show Trial Status only for Stripe subscriptions with active trial */}
        {isStripeSubscription && isOnTrial && <TrialStatus />}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-6 py-4"
        >
          {/* Subscription Details */}
          {details && !loading && (
            <MotionCard
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="p-6 space-y-4"
            >
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold capitalize">
                  {details.tier} Plan
                </h3>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                {/* Subscriber Usage */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span>Subscriber Usage</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {details.currentSubscribers} / {details.subscriberLimit}
                    </span>
                  </div>
                  <Progress
                    value={(details.currentSubscribers / details.subscriberLimit) * 100}
                    className="h-2"
                  />
                </div>

                {/* AI Credits */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Coins className="h-4 w-4" />
                      <span>AI Credits</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {details.aiCreditsTotal - details.aiCreditsUsed} remaining
                    </span>
                  </div>
                  <Progress
                    value={((details.aiCreditsTotal - details.aiCreditsUsed) / details.aiCreditsTotal) * 100}
                    className="h-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 text-sm pt-4">
                <div>
                  <span className="text-muted-foreground">Status</span>
                  <p className="font-medium capitalize">{details.status}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Provider</span>
                  <p className="font-medium capitalize">{details.provider}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Activated</span>
                  <p className="font-medium">
                    {new Date(details.activatedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              
              {/* Show Stripe Customer Portal button only for Stripe subscriptions */}
              {isStripeSubscription && (
                <div className="pt-4">
                  <Button 
                    onClick={handleOpenStripePortal}
                    className="w-full flex items-center gap-2"
                  >
                    <CreditCard className="h-4 w-4" />
                    <span>Manage Subscription in Stripe Portal</span>
                    <ExternalLink className="h-4 w-4 ml-auto" />
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    Access payment methods, billing history, and subscription options
                  </p>
                </div>
              )}

              {/* Special notice for AppSumo users */}
              {isAppSumoSubscription && (
                <div className="pt-4 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 p-3 rounded-md border border-purple-200 dark:border-purple-800">
                  <p className="text-sm text-center font-medium">
                    Lifetime Deal
                  </p>
                  <p className="text-xs text-center text-muted-foreground mt-1">
                    You have lifetime access to this plan with no recurring charges
                  </p>
                </div>
              )}
            </MotionCard>
          )}

          {/* Credit Packages */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Purchase Credits</h3>
            <div className="grid gap-4 md:grid-cols-3">
              {creditPackages.map((pkg, index) => (
                <MotionCard
                  key={pkg.id}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-4 relative overflow-hidden"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{pkg.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {pkg.description}
                        </p>
                      </div>
                      <div className="rounded-full bg-primary/10 p-2">
                        <Coins className="h-4 w-4 text-primary" />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold">${pkg.price}</span>
                        <span className="text-muted-foreground">{pkg.currency}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {pkg.credits.toLocaleString()} credits
                      </p>
                    </div>

                    <Button
                      className="w-full"
                      onClick={() => handlePurchase(pkg.id)}
                      disabled={purchaseLoading === pkg.id}
                    >
                      {purchaseLoading === pkg.id ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        >
                          <AlertCircle className="h-4 w-4" />
                        </motion.div>
                      ) : (
                        "Purchase"
                      )}
                    </Button>
                  </div>

                  {/* Background decoration */}
                  <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-primary/5 rounded-full" />
                </MotionCard>
              ))}
            </div>
          </div>

          {/* Purchase History */}
          {purchases.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Purchase History</h3>
              <AnimatePresence>
                {(expanded ? purchases : purchases.slice(0, 3)).map((purchase, index) => (
                  <MotionCard
                    key={purchase.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="rounded-full bg-primary/10 p-2">
                          <Coins className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">
                              {purchase.creditsAmount.toLocaleString()} Credits
                            </p>
                            <div className="flex items-center gap-1 text-sm">
                              {getStatusIcon(purchase.status)}
                              <span
                                className={
                                  purchase.status === "completed"
                                    ? "text-green-500"
                                    : purchase.status === "pending"
                                    ? "text-yellow-500"
                                    : "text-red-500"
                                }
                              >
                                {purchase.status.charAt(0).toUpperCase() +
                                  purchase.status.slice(1)}
                              </span>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {new Date(purchase.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <p className="text-right font-medium">
                        {(purchase.pricePaid / 100).toLocaleString("en-US", {
                          style: "currency",
                          currency: purchase.currency,
                        })}
                      </p>
                    </div>
                  </MotionCard>
                ))}
              </AnimatePresence>
              {purchases.length > 3 && (
                <Button
                  variant="ghost"
                  onClick={() => setExpanded(!expanded)}
                  className="w-full"
                >
                  {expanded ? "Show Less" : `Show ${purchases.length - 3} More`}
                </Button>
              )}
            </div>
          )}
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
