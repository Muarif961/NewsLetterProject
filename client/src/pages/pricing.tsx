import { useState } from "react";
import { useLocation } from "wouter";
import bg from "../assets/price-bg.png";
import { Card } from "../components/ui/card";
import { Check, Sparkles, Zap } from "lucide-react";
import { Button } from "../components/ui/button";
import { Switch } from "../components/ui/switch";
import Header from "../components/landing/Header";
import Footer from "../components/landing/Footer";
import { useUser } from "../hooks/use-user";

// Plan IDs for URL parameters
const PLAN_IDS = {
  "Starter Plan": "starter",
  "Growth Plan": "growth",
  "Professional Plan": "professional",
  "Professional+ Plan": "professional-plus"
};

const subscriptionTiers = [
  {
    id: "starter",
    name: "Starter Plan",
    monthlyPrice: "29",
    yearlyPrice: "24",
    description: "Perfect for beginners and small newsletters",
    trial: true, // Has 14-day free trial
    features: [
      "5,000 Subscribers/Contacts",
      "Unlimited email sends",
      "Customizable newsletter templates",
      "50 Free credits for AI-powered Features",
      "24/7 support"
    ]
  },
  {
    id: "growth",
    name: "Growth Plan",
    monthlyPrice: "49",
    yearlyPrice: "39",
    description: "Ideal for growing newsletters",
    recommended: true,
    trial: true, // Has 14-day free trial
    features: [
      "10,000 Subscribers/Contacts",
      "Unlimited email sends",
      "Customizable newsletter templates",
      "120 Free credits for AI-powered Features",
      "24/7 support"
    ]
  },
  {
    id: "professional",
    name: "Professional Plan",
    monthlyPrice: "99",
    yearlyPrice: "79",
    description: "For serious newsletter creators",
    trial: true, // Has 14-day free trial
    features: [
      "20,000 Subscribers/Contacts",
      "Unlimited email sends",
      "Customizable newsletter templates",
      "150 Free credits for AI-powered Features",
      "24/7 support"
    ]
  },
  {
    id: "professional-plus",
    name: "Professional+ Plan",
    monthlyPrice: "129",
    yearlyPrice: "109",
    description: "Our most comprehensive option",
    trial: true, // Has 14-day free trial
    features: [
      "25,000 Subscribers/Contacts",
      "Unlimited email sends",
      "Customizable newsletter templates",
      "200 Free credits for AI-powered Features",
      "24/7 support"
    ]
  }
];

const Pricing = () => {
  const { user, subscriptionData } = useUser();
  const [isAnnual, setIsAnnual] = useState(true);
  const [, setLocation] = useLocation();

  // Handle selecting a plan
  const handleSelectPlan = (plan) => {
    // If user is already logged in, handle upgrade flow
    if (user) {
      // For now just log that this would navigate to a payment page
      console.log("User already logged in, would navigate to payment page for plan:", plan.id);
      return;
    }
    
    // Otherwise redirect to signup with plan details
    const interval = isAnnual ? "yearly" : "monthly";
    setLocation(`/signup?plan=${plan.id}&interval=${interval}`);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div
        className="h-[400px] md:h-[500px] flex items-center justify-center relative !bg-no-repeat !bg-cover !bg-center"
        style={{ background: `url(${bg})` }}
      >
        <div className="text-center space-y-6">
          <h1 className="text-white text-5xl lg:text-7xl font-medium">
            Choose Your Plan
          </h1>
          <div className="flex items-center justify-center gap-4">
            <span className={`text-lg ${!isAnnual ? 'text-white' : 'text-white/70'}`}>Monthly</span>
            <Switch
              checked={isAnnual}
              onCheckedChange={setIsAnnual}
              className="data-[state=checked]:bg-primary"
            />
            <span className={`text-lg ${isAnnual ? 'text-white' : 'text-white/70'}`}>Annual</span>
            <span className="ml-2 px-3 py-1 bg-primary/20 text-white text-sm rounded-full">
              Save up to 20%
            </span>
          </div>
        </div>
      </div>

      {user && subscriptionData?.subscription && (
        <div className="max-w-7xl mx-auto px-4 py-8">
          <Card className="p-6 bg-gradient-to-r from-blue-500/10 to-purple-500/10">
            <h2 className="text-2xl font-semibold mb-4">Current Subscription</h2>
            <div className="space-y-2">
              <p>
                <span className="font-medium">Plan:</span>{" "}
                {subscriptionData.subscription.planTier.charAt(0).toUpperCase() +
                  subscriptionData.subscription.planTier.slice(1)}
              </p>
              <p>
                <span className="font-medium">Subscriber Limit:</span>{" "}
                {subscriptionData.subscription.subscriberLimit.toLocaleString()}
              </p>
              <p>
                <span className="font-medium">Type:</span>{" "}
                {subscriptionData.subscription.isLifetime
                  ? "Lifetime Access"
                  : "Standard"}
              </p>
            </div>
          </Card>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {subscriptionTiers.map((tier) => (
            <Card
              key={tier.name}
              className={`p-6 flex flex-col transition-all duration-300 ${
                tier.recommended
                  ? "relative scale-105 shadow-lg border-primary border-2 z-10"
                  : "hover:shadow-lg"
              }`}
            >
              {tier.recommended && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium">
                  Recommended
                </div>
              )}
              <h3 className="text-2xl font-semibold mb-2">{tier.name}</h3>
              {tier.trial && (
                <div className="mb-2 flex items-center text-sm font-medium text-green-600">
                  <Sparkles className="h-4 w-4 mr-1" />
                  14-day free trial
                </div>
              )}
              <div className="text-4xl font-bold mb-2">
                ${isAnnual ? tier.yearlyPrice : tier.monthlyPrice}
                <span className="text-sm font-normal text-muted-foreground">
                  /month
                </span>
              </div>
              {isAnnual && (
                <p className="text-sm text-muted-foreground mb-2">
                  Billed annually (${Number(tier.yearlyPrice) * 12}/year)
                </p>
              )}
              <p className="text-sm text-muted-foreground mb-4">{tier.description}</p>
              <ul className="space-y-4 mb-8 flex-grow">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-green-500" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Button 
                className={`w-full ${tier.recommended ? 'bg-primary hover:bg-primary/90' : ''}`} 
                size="lg"
                onClick={() => handleSelectPlan(tier)}
              >
                {tier.trial ? (
                  <>
                    <Zap className="h-4 w-4 mr-2" /> 
                    Start Free Trial
                  </>
                ) : (
                  'Get Started'
                )}
              </Button>
            </Card>
          ))}
        </div>
      </div>

      <div className="mt-auto">
        <Footer />
      </div>
    </div>
  );
};

export default Pricing;