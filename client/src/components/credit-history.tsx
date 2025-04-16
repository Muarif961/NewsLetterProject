import { useState } from "react";
import { Card } from "./ui/card";
import { format } from "date-fns";
import { Coins, Clock, CheckCircle, XCircle } from "lucide-react";
import useSWR from "swr";

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

export function CreditHistory() {
  const { data: purchases, error } = useSWR<CreditPurchase[]>("/api/credits/history");
  const [expanded, setExpanded] = useState(false);

  const displayPurchases = expanded ? purchases : purchases?.slice(0, 3);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  if (error) {
    return (
      <Card className="p-4">
        <p className="text-sm text-muted-foreground">
          Failed to load purchase history
        </p>
      </Card>
    );
  }

  if (!purchases?.length) {
    return (
      <Card className="p-6 text-center">
        <div className="flex flex-col items-center gap-2">
          <div className="rounded-full bg-primary/10 p-3">
            <Coins className="h-6 w-6 text-primary" />
          </div>
          <h3 className="font-semibold">No Purchase History</h3>
          <p className="text-sm text-muted-foreground">
            Your credit purchase history will appear here
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {displayPurchases?.map((purchase) => (
        <Card key={purchase.id} className="p-4">
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
                  {format(new Date(purchase.createdAt), "PPP")}
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
        </Card>
      ))}
      {purchases.length > 3 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-sm text-primary hover:underline"
        >
          {expanded ? "Show Less" : `Show ${purchases.length - 3} More`}
        </button>
      )}
    </div>
  );
}
