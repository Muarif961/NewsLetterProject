import { useEffect, useState } from "react";
import { Card } from "./ui/card";
import { Progress } from "./ui/progress";
import { Button } from "./ui/button";
import { Coins, Users, Star, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
  isTrialActive?: boolean;
  trialEndsAt?: string;
  metadata?: {
    trialEndsAt?: string;
    [key: string]: any;
  };
}

export function SubscriptionTracker() {
  const [details, setDetails] = useState<SubscriptionDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchSubscriptionDetails = async () => {
      try {
        setLoading(true);
        setError(null);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

        const response = await fetch("/api/subscription/details", {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          credentials: 'include' // Important for cookies/session
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`Failed to fetch subscription details: ${response.statusText}`);
        }

        const data = await response.json();
        setDetails(data);
      } catch (error: any) {
        console.error("Error fetching subscription details:", error);
        setError(error.message);
        toast({
          title: "Error",
          description: "Failed to load subscription details. Please try again later.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchSubscriptionDetails();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <p>Failed to load subscription details. Please try again later.</p>
        </div>
        <Button 
          onClick={() => window.location.reload()} 
          variant="outline" 
          className="mt-4"
        >
          Retry
        </Button>
      </Card>
    );
  }

  if (!details) {
    return (
      <Card className="p-6">
        <p className="text-muted-foreground">No subscription details available</p>
      </Card>
    );
  }

  const subscriberPercentage = (details.currentSubscribers / details.subscriberLimit) * 100;
  const creditsPercentage = ((details.aiCreditsTotal - details.aiCreditsUsed) / details.aiCreditsTotal) * 100;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Subscription Details</h2>

      {/* Trial Banner */}
      {details.isTrialActive && details.trialEndsAt && (
        <Card className="p-4 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
          <div className="flex items-center space-x-3">
            <div>
              <p className="font-medium">
                Trial Period: {Math.max(0, Math.ceil((new Date(details.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))} days remaining
              </p>
              <p className="text-sm text-muted-foreground">
                Your trial ends on {new Date(details.trialEndsAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Trial Banner using metadata as fallback */}
      {!details.isTrialActive && details.metadata?.trialEndsAt && (
        <Card className="p-4 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
          <div className="flex items-center space-x-3">
            <div>
              <p className="font-medium">
                Trial Period: {Math.max(0, Math.ceil((new Date(details.metadata.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))} days remaining
              </p>
              <p className="text-sm text-muted-foreground">
                Your trial ends on {new Date(details.metadata.trialEndsAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Users className="h-5 w-5" />
              Subscriber Usage
            </h3>
            <span className="text-sm text-muted-foreground">
              {details.currentSubscribers} / {details.subscriberLimit}
            </span>
          </div>
          <Progress value={subscriberPercentage} className="h-2" />
          {details.hasReachedLimit && (
            <div className="flex items-center gap-2 text-amber-500">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">You've reached your subscriber limit</span>
            </div>
          )}
        </Card>

        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Coins className="h-5 w-5" />
              AI Credits
            </h3>
            <span className="text-sm text-muted-foreground">
              {details.aiCreditsTotal - details.aiCreditsUsed} credits remaining
            </span>
          </div>
          <Progress value={creditsPercentage} className="h-2" />
          {details.aiCreditsUsed >= details.aiCreditsTotal && (
            <div className="flex items-center gap-2 text-amber-500">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">You've used all your AI credits</span>
            </div>
          )}
        </Card>
      </div>

      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Star className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold capitalize">{details.tier} Plan</h3>
          </div>

          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-muted-foreground">Status</dt>
              <dd className="font-medium capitalize">
                {details.isTrialActive || details.metadata?.trialEndsAt ? "Trial" : details.status}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Provider</dt>
              <dd className="font-medium capitalize">{details.provider}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Activated</dt>
              <dd className="font-medium">
                {new Date(details.activatedAt).toLocaleDateString()}
              </dd>
            </div>
          </dl>
        </div>
      </Card>
    </div>
  );
}