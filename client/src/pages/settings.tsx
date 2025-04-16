import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DashboardLayout } from "../components/dashboard-layout";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Globe, HelpCircle, CreditCard, LifeBuoy } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Sidebar } from "../components/ui/sidebar";
import { BillingModal } from "../components/modals/billing-modal";
import { onboardingState } from "@/hooks/use-onboarding";

export default function Settings() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [language, setLanguage] = useState("en");
  const [formLoading, setFormLoading] = useState(true);
  const [billingModalOpen, setBillingModalOpen] = useState(false);

  const handleLanguageChange = (value: string) => {
    setLanguage(value);
    localStorage.setItem("preferredLanguage", value);
    toast({
      title: "Feature Coming Soon",
      description: "Our Developers are working Hard on it",
    });
  };

  return (
    <DashboardLayout>
      <Sidebar />
      <div className="container mx-auto px-4 py-6 space-y-8">
        {/* Billing Overview */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold">Billing & Credits</h2>
              <p className="text-muted-foreground">
                Manage your subscription and AI credits
              </p>
            </div>
            <Button onClick={() => setBillingModalOpen(true)} className="gap-2">
              <CreditCard className="h-4 w-4" />
              Manage Billing
            </Button>
          </div>
        </Card>

        {/* Language Settings */}
        <Card className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <Globe className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Language</h2>
          </div>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="language">Select Your Language</Label>
              <Select value={language} onValueChange={handleLanguageChange}>
                <SelectTrigger className="max-w-lg" id="language">
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Español</SelectItem>
                  <SelectItem value="fr">Français</SelectItem>
                  <SelectItem value="de">Deutsch</SelectItem>
                  <SelectItem value="zh">中文</SelectItem>
                  <SelectItem value="ja">日本語</SelectItem>
                  <SelectItem value="ko">한국어</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Choose your preferred language for the application interface
              </p>
            </div>
          </div>
        </Card>

        {/* Help & Support */}
        <Card className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <HelpCircle className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Help & Support</h2>
          </div>
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="font-medium">Quick Links</h3>
                <div className="grid gap-2">
                  <Button
                    variant="link"
                    className="justify-start p-0 h-auto font-normal"
                    onClick={() => setLocation("/help/getting-started")}
                  >
                    Getting Started Guide
                  </Button>
                  <Button
                    variant="link"
                    className="justify-start p-0 h-auto font-normal"
                    onClick={() => setLocation("/help/faq")}
                  >
                    Frequently Asked Questions
                  </Button>
                  <Button
                    variant="link"
                    className="justify-start p-0 h-auto font-normal"
                    onClick={() => setLocation("/help/tutorials")}
                  >
                    Video Tutorials
                  </Button>
                </div>
              </div>
              <div className="pt-4 border-t space-y-4">
                <div className="flex justify-between items-center">
                  <Button
                    variant="outline"
                    onClick={() => setLocation("/help/contact")}
                    className="gap-2"
                  >
                    Contact Support Team
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      const onboarding = onboardingState;
                      onboarding.setFirstTime(true);
                      onboarding.endOnboarding(); // Reset completion status
                      onboarding.startOnboarding();
                      
                      toast({
                        title: "Onboarding Tour Restarted",
                        description: "Follow the guided tour to learn about key features",
                      });
                    }}
                    className="gap-2"
                  >
                    <LifeBuoy className="h-4 w-4" />
                    Restart Onboarding Tour
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Feedback Section */}
        <Card className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <HelpCircle className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Share Your Feedback</h2>
          </div>
          <div className="w-full h-[600px] relative">
            {formLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background">
                <p className="text-muted-foreground">
                  Loading feedback form...
                </p>
              </div>
            )}
            <iframe
              src="https://docs.google.com/forms/d/e/1FAIpQLSc6VWokTKf-Z2BjFX42XSxTERunH1IcGsf5JmCxpnsdLJMv-A/viewform"
              width="100%"
              height="100%"
              frameBorder="0"
              marginHeight={0}
              marginWidth={0}
              onLoad={() => setFormLoading(false)}
              className="bg-background"
            >
              Loading feedback form...
            </iframe>
          </div>
        </Card>

        {/* Billing Modal */}
        <BillingModal
          open={billingModalOpen}
          onOpenChange={setBillingModalOpen}
        />
      </div>
    </DashboardLayout>
  );
}
