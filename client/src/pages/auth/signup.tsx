import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useUser } from "@/hooks/use-user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Form from "../../assets/form.png";
import Footer from "@/components/landing/Footer";
import Header from "@/components/landing/Header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2, Star, Sparkles, Zap } from "lucide-react";

const signupSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters").max(50),
  email: z.string().email("Please enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Password must contain at least one uppercase letter, one lowercase letter, and one number",
    ),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  terms: z.boolean().refine((val) => val === true, {
    message: "You must accept the Terms and Privacy Policy",
  }),
});

// Subscription plans data
const subscriptionPlans = [
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
      "24/7 support",
    ],
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
      "24/7 support",
    ],
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
      "24/7 support",
    ],
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
      "24/7 support",
    ],
  },
];

export default function SignupPage() {
  const { register: registerUser } = useUser();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);

  // Get plan details from URL parameters
  const params = new URLSearchParams(window.location.search);
  const planId = params.get("plan") || "starter";
  const interval = params.get("interval") || "monthly";

  // Find the selected plan from the URL parameters
  useEffect(() => {
    const plan = subscriptionPlans.find((p) => p.id === planId);
    if (plan) {
      setSelectedPlan({
        ...plan,
        interval: interval,
      });
    } else {
      // Default to starter plan if no valid plan is specified
      setSelectedPlan({
        ...subscriptionPlans[0],
        interval: interval,
      });
    }
  }, [planId, interval]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(signupSchema),
  });

  const handleStripeCheckout = async (userData: any) => {
    try {
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...userData,
          planType: selectedPlan?.id || "starter",
          interval: selectedPlan?.interval || "monthly",
        }),
      });

      const { sessionUrl } = await response.json();
      if (sessionUrl) {
        window.location.href = sessionUrl;
      } else {
        throw new Error("Failed to create checkout session");
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to process payment",
      });
    }
  };

  const onSubmit = async (data: any) => {
    setIsLoading(true);
    try {
      await handleStripeCheckout({
        username: data.username,
        password: data.password,
        email: data.email,
        fullName: `${data.firstName} ${data.lastName}`,
        provider: "stripe",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Function to change plan
  const handleChangePlan = () => {
    setLocation("/pricing");
  };

  return (
    <>
      <Header />
      <div className="min-h-screen flex items-center justify-center relative bg-background">
        <img
          src={Form}
          alt="background"
          className="absolute inset-0 w-full h-full object-cover opacity-30 dark:opacity-20"
        />
        <div className="container max-w-4xl px-6 py-16 relative z-10">
          

          <div className="grid md:grid-cols-3 gap-6">
            {/* Selected plan card */}
            <div className="md:col-span-1 order-2 md:order-1">
              {selectedPlan && (
                <Card className="p-6 h-full flex flex-col border-2 border-primary shadow-lg">
                  <div className="text-center mb-4">
                    <h3 className="text-xl font-semibold mb-1">
                      {selectedPlan.name}
                    </h3>
                    {selectedPlan.trial && (
                      <div className="mt-3 mb-2 flex items-center justify-center px-3 py-2 rounded-md bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border border-green-200 dark:border-green-800">
                        <Sparkles className="h-5 w-5 mr-2 text-green-600 dark:text-green-400" />
                        <span className="text-sm font-medium text-green-700 dark:text-green-400">
                          Start with a 14-day free trial
                        </span>
                      </div>
                    )}
                    {selectedPlan.recommended && (
                      <Badge
                        variant="outline"
                        className="bg-blue-50 text-blue-700 border-blue-200 ml-2"
                      >
                        Recommended
                      </Badge>
                    )}
                  </div>

                  <div className="text-center mb-4">
                    <div className="text-3xl font-bold">
                      $
                      {selectedPlan.interval === "yearly"
                        ? selectedPlan.yearlyPrice
                        : selectedPlan.monthlyPrice}
                      <span className="text-sm font-normal text-muted-foreground">
                        /month
                      </span>
                    </div>
                    {selectedPlan.interval === "yearly" && (
                      <p className="text-sm text-muted-foreground">
                        Billed annually ($
                        {Number(selectedPlan.yearlyPrice) * 12}/year)
                      </p>
                    )}
                    <p className="text-sm mt-2">{selectedPlan.description}</p>
                  </div>

                  <div className="flex-grow">
                    <h4 className="font-medium mb-2">What's included:</h4>
                    <ul className="space-y-2 mb-4">
                      {selectedPlan.features.map((feature) => (
                        <li key={feature} className="flex items-center text-sm">
                          <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Button
                    variant="outline"
                    className="mt-4 w-full"
                    onClick={handleChangePlan}
                  >
                    Change Plan
                  </Button>
                </Card>
              )}
            </div>

            {/* Registration form */}
            <div className="md:col-span-2 order-1 md:order-2">
              <div className="p-6 md:p-8 rounded-xl space-y-4 bg-card border border-border shadow-lg dark:bg-card">
                <div className="grid grid-cols-2 text-center rounded-[10px] overflow-hidden">
                  <div className="py-3 text-primary-foreground bg-primary">
                    Sign up
                  </div>
                  <Link
                    href="/login"
                    className="py-3 text-foreground bg-muted hover:bg-muted/90 transition-colors"
                  >
                    Log in
                  </Link>
                </div>

                <div className="mx-auto w-full">
                  <h2 className="!my-6 text-2xl font-medium text-center">
                    Create your account
                  </h2>

                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                    <div className="grid md:grid-cols-2 gap-5">
                      <div className="grid gap-2">
                        <label
                          htmlFor="firstName"
                          className="font-medium text-[#666666]"
                        >
                          First Name
                        </label>
                        <Input
                          {...register("firstName")}
                          type="text"
                          id="firstName"
                          className="rounded-md p-2.5 border border-[#66666659]"
                        />
                        {errors.firstName && (
                          <p className="text-sm text-red-500">
                            {errors.firstName.message}
                          </p>
                        )}
                      </div>
                      <div className="grid gap-2">
                        <label
                          htmlFor="lastName"
                          className="font-medium text-[#666666]"
                        >
                          Last Name
                        </label>
                        <Input
                          {...register("lastName")}
                          type="text"
                          id="lastName"
                          className="rounded-md p-2.5 border border-[#66666659]"
                        />
                        {errors.lastName && (
                          <p className="text-sm text-red-500">
                            {errors.lastName.message}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <label
                        htmlFor="email"
                        className="font-medium text-[#666666]"
                      >
                        Email Address
                      </label>
                      <Input
                        {...register("email")}
                        type="email"
                        id="email"
                        className="rounded-md p-2.5 border border-[#66666659]"
                      />
                      {errors.email && (
                        <p className="text-sm text-red-500">
                          {errors.email.message}
                        </p>
                      )}
                    </div>

                    <div className="grid gap-2">
                      <label
                        htmlFor="username"
                        className="font-medium text-[#666666]"
                      >
                        Username
                      </label>
                      <Input
                        {...register("username")}
                        type="text"
                        id="username"
                        className="rounded-md p-2.5 border border-[#66666659]"
                      />
                      {errors.username && (
                        <p className="text-sm text-red-500">
                          {errors.username.message}
                        </p>
                      )}
                    </div>

                    <div className="grid gap-2">
                      <label
                        htmlFor="password"
                        className="font-medium text-[#666666]"
                      >
                        Password
                      </label>
                      <Input
                        {...register("password")}
                        type="password"
                        id="password"
                        className="rounded-md p-2.5 border border-[#66666659]"
                      />
                      {errors.password && (
                        <p className="text-sm text-red-500">
                          {errors.password.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-start space-x-2">
                        <input
                          type="checkbox"
                          id="terms"
                          {...register("terms")}
                          className="mt-1 rounded border-border"
                        />
                        <label
                          htmlFor="terms"
                          className="text-sm text-muted-foreground"
                        >
                          I agree to the{" "}
                          <Link
                            href="/terms"
                            className="text-primary hover:underline"
                          >
                            Terms of Service
                          </Link>{" "}
                          and{" "}
                          <Link
                            href="/privacy-policy"
                            className="text-primary hover:underline"
                          >
                            Privacy Policy
                          </Link>
                        </label>
                      </div>
                      {errors.terms && (
                        <p className="text-sm text-red-500">
                          {errors.terms.message}
                        </p>
                      )}
                      <Button
                        type="submit"
                        className="w-full py-6 text-base"
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Proceeding to Payment...
                          </>
                        ) : selectedPlan?.trial ? (
                          <>
                            <Zap className="mr-2 h-5 w-5" />
                            Start Your 14-Day Free Trial
                          </>
                        ) : (
                          "Continue to Payment"
                        )}
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
