import React from "react";
import { Button } from "@/components/ui/button";
import { Coins } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useQuery } from "@tanstack/react-query";
import useFetch from "@/hooks/use-fetch";

interface CreditWidgetProps {
  onPurchaseClick?: () => void;
  onDetailsClick?: () => void;
  variant?: "default" | "compact";
}

export function CreditWidget({ 
  onPurchaseClick, 
  onDetailsClick,
  variant = "default" 
}: CreditWidgetProps) {
  const api = useFetch();
  
  // Fetch credit balance
  const { data, isLoading } = useQuery({
    queryKey: ["credit-balance-widget"],
    queryFn: async () => {
      const response = await api.get("/api/credits/balance");
      if (!response.ok) {
        return { credits: { remaining: 0, total: 0 } };
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Determine if credits are low (less than 10% remaining)
  const credits = data?.credits;
  const lowCredits = credits && credits.remaining < credits.total * 0.1;

  // Compact variant just shows the credit amount with tooltip
  if (variant === "compact") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={`gap-1 px-2 py-1 ${
                lowCredits ? "text-amber-500" : ""
              }`}
              onClick={onDetailsClick}
            >
              <Coins className="h-3.5 w-3.5" />
              <span>
                {isLoading ? "..." : credits?.remaining.toLocaleString()}
              </span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              {isLoading
                ? "Loading credits..."
                : `${credits?.remaining.toLocaleString()} AI credits remaining`}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Default variant shows more details
  return (
    <div className="flex items-center gap-2">
      <div>
        <div className="text-sm font-medium flex items-center gap-1">
          <Coins className="h-3.5 w-3.5" />
          <span>AI Credits:</span>
        </div>
        <div className={`text-sm ${lowCredits ? "text-amber-500" : ""}`}>
          {isLoading
            ? "Loading..."
            : `${credits?.remaining.toLocaleString()} remaining`}
        </div>
      </div>
      <Button variant="outline" size="sm" onClick={onPurchaseClick}>
        Buy
      </Button>
    </div>
  );
}

export default CreditWidget;