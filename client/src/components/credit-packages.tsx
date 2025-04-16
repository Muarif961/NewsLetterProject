import { useState } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Coins, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

export function CreditPackages() {
  const [loading, setLoading] = useState<string | null>(null);
  const { toast } = useToast();

  const handlePurchase = async (packageId: string) => {
    try {
      setLoading(packageId);
      const response = await fetch("/api/credits/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ packageId }),
      });

      if (!response.ok) {
        throw new Error("Failed to create checkout session");
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error("Purchase error:", error);
      toast({
        title: "Error",
        description: "Failed to initiate purchase. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {creditPackages.map((pkg) => (
        <Card key={pkg.id} className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="font-semibold">{pkg.name}</h3>
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
                <span className="text-3xl font-bold">${pkg.price}</span>
                <span className="text-muted-foreground">USD</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {pkg.credits.toLocaleString()} AI credits
              </p>
            </div>
            <Button
              className="w-full"
              onClick={() => handlePurchase(pkg.id)}
              disabled={loading === pkg.id}
            >
              {loading === pkg.id ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Purchase Credits"
              )}
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
