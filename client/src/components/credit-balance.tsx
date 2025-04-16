import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Coins, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import useFetch from "@/hooks/use-fetch";

interface CreditBalanceProps {
  onPurchaseClick?: () => void;
}

export function CreditBalance({ onPurchaseClick }: CreditBalanceProps) {
  const { toast } = useToast();
  const api = useFetch();
  
  // Fetch credit balance
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["credit-balance"],
    queryFn: async () => {
      const response = await api.get("/api/credits/balance");
      if (!response.ok) {
        throw new Error("Failed to fetch credit balance");
      }
      return response.json();
    },
  });

  // Calculate credit usage percentage
  const creditPercentage = data
    ? Math.floor((data.credits.remaining / data.credits.total) * 100)
    : 0;

  // Determine if credits are low (less than 10% remaining)
  const lowCredits = data && data.credits.remaining < data.credits.total * 0.1;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl">AI Credits</CardTitle>
            <CardDescription>Your current credit balance</CardDescription>
          </div>
          <Coins className="h-8 w-8 text-primary opacity-80" />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="py-4 text-center text-muted-foreground">
            Loading credit information...
          </div>
        ) : error ? (
          <Alert variant="destructive" className="my-2">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              Could not load credit information. Please try again later.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between">
              <div className="font-medium">
                {data.credits.remaining.toLocaleString()} / {data.credits.total.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">
                {data.credits.used.toLocaleString()} used
              </div>
            </div>

            <Progress value={creditPercentage} className="h-2" />

            {lowCredits && (
              <Alert className="mt-4 border-amber-500 bg-amber-50 text-amber-800">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Low Credits</AlertTitle>
                <AlertDescription>
                  You are running low on AI credits. Consider purchasing more to
                  continue using AI features.
                </AlertDescription>
              </Alert>
            )}

            <div className="mt-4 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={onPurchaseClick}
                className="gap-2"
              >
                <Coins className="h-4 w-4" />
                Purchase Credits
              </Button>
            </div>

            {data.recentTransactions && data.recentTransactions.length > 0 && (
              <div className="mt-4">
                <h4 className="mb-2 text-sm font-medium">Recent Activity</h4>
                <div className="space-y-1">
                  {data.recentTransactions.slice(0, 3).map((tx: any) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`flex h-6 w-6 items-center justify-center rounded-full ${
                            tx.type === "add" ? "bg-green-100" : "bg-blue-100"
                          } ${
                            tx.type === "add"
                              ? "text-green-600"
                              : "text-blue-600"
                          }`}
                        >
                          {tx.type === "add" ? "+" : "-"}
                        </span>
                        <span className="truncate max-w-[180px]">
                          {tx.action.charAt(0).toUpperCase() +
                            tx.action.slice(1).replace(/_/g, " ")}
                        </span>
                      </div>
                      <div
                        className={`${
                          tx.type === "add" ? "text-green-600" : "text-blue-600"
                        } font-medium`}
                      >
                        {tx.type === "add" ? "+" : "-"}
                        {Math.abs(tx.amount)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default CreditBalance;