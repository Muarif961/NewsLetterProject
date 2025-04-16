import React, { useState } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditBalance } from "@/components/credit-balance";
import { CreditUsageBreakdown } from "@/components/credit-usage-breakdown";
import { Button, buttonVariants } from "@/components/ui/button";
import { Coins, CreditCard, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import useFetch from "@/hooks/use-fetch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";

export function CreditsPage() {
  const { toast } = useToast();
  const api = useFetch();
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch credit packages
  const { data: packages, isLoading: packagesLoading } = useQuery({
    queryKey: ["credit-packages"],
    queryFn: async () => {
      const response = await api.get("/api/credits/packages");
      if (!response.ok) {
        throw new Error("Failed to fetch credit packages");
      }
      return response.json();
    },
  });

  // Handle credit purchase
  const handlePurchase = async (packageId: string) => {
    setSelectedPackage(packageId);
    setIsProcessing(true);

    try {
      const response = await api.post("/api/credits/checkout", {
        packageId,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || "Failed to create checkout session");
      }

      const data = await response.json();
      setCheckoutUrl(data.url);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Could not create checkout session",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Open purchase modal
  const openPurchaseModal = () => {
    setSelectedPackage(null);
    setCheckoutUrl(null);
    setPurchaseModalOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-6 space-y-8">
        <div className="flex flex-col md:flex-row items-start gap-6">
          {/* Credit Balance Section */}
          <div className="w-full md:w-1/3">
            <CreditBalance onPurchaseClick={openPurchaseModal} />
          </div>

          {/* Credit Usage Analytics */}
          <div className="w-full md:w-2/3">
            <CreditUsageBreakdown />
          </div>
        </div>

        {/* Credit Packages Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Credit Packages</CardTitle>
                <CardDescription>
                  Purchase additional AI credits for your newsletters
                </CardDescription>
              </div>
              <Package className="h-6 w-6 text-primary opacity-80" />
            </div>
          </CardHeader>
          <CardContent>
            {packagesLoading ? (
              <div className="grid gap-6 md:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="p-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Skeleton className="h-6 w-[100px]" />
                        <Skeleton className="h-8 w-8 rounded-full" />
                      </div>
                      <div>
                        <Skeleton className="h-8 w-[80px] mb-1" />
                        <Skeleton className="h-4 w-[120px]" />
                      </div>
                      <Skeleton className="h-10 w-full" />
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-3">
                {packages?.map((pkg: any) => (
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
                        disabled={isProcessing === pkg.id}
                      >
                        {isProcessing === pkg.id ? (
                          <>Processing...</>
                        ) : (
                          "Purchase Credits"
                        )}
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Purchase Modal */}
        <Dialog open={purchaseModalOpen} onOpenChange={setPurchaseModalOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Purchase AI Credits</DialogTitle>
              <DialogDescription>
                Choose a credit package to enhance your newsletters with AI
              </DialogDescription>
            </DialogHeader>

            {checkoutUrl ? (
              <div className="flex flex-col items-center space-y-4 py-4">
                <div className="text-center space-y-2">
                  <h3 className="text-lg font-semibold">Ready to complete your purchase</h3>
                  <p className="text-muted-foreground">
                    Click the button below to proceed to secure checkout
                  </p>
                </div>
                <div className="flex gap-3 mt-4">
                  <Button variant="ghost" onClick={() => setPurchaseModalOpen(false)}>
                    Cancel
                  </Button>
                  <a
                    href={checkoutUrl}
                    className={buttonVariants({ variant: "default" })}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <CreditCard className="mr-2 h-4 w-4" />
                    Proceed to Checkout
                  </a>
                </div>
              </div>
            ) : (
              <Tabs defaultValue="packages">
                <TabsList className="grid w-full grid-cols-1">
                  <TabsTrigger value="packages">Credit Packages</TabsTrigger>
                </TabsList>
                <TabsContent value="packages" className="space-y-4 py-4">
                  {packagesLoading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="space-y-1">
                            <Skeleton className="h-5 w-[100px]" />
                            <Skeleton className="h-4 w-[150px]" />
                          </div>
                          <Skeleton className="h-9 w-[100px]" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {packages?.map((pkg: any) => (
                        <div
                          key={pkg.id}
                          className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-colors ${
                            selectedPackage === pkg.id
                              ? "bg-primary/5 border-primary"
                              : "hover:bg-muted/50"
                          }`}
                          onClick={() => setSelectedPackage(pkg.id)}
                        >
                          <div className="space-y-1">
                            <div className="font-medium flex items-center gap-2">
                              <Coins className="h-4 w-4 text-primary" />
                              {pkg.name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {pkg.credits.toLocaleString()} credits - ${pkg.price}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            disabled={isProcessing}
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePurchase(pkg.id);
                            }}
                          >
                            Select
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

export default CreditsPage;