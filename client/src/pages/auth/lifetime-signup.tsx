import { useState } from "react";
import { useLocation } from "wouter";
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
import { X, Loader2 } from "lucide-react";

const lifetimeSignupSchema = z.object({
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
  appSumoCodes: z
    .array(z.string())
    .min(1, "At least one AppSumo code is required")
    .max(3),
  terms: z.boolean().refine((val) => val === true, {
    message: "You must accept the Terms and Privacy Policy",
  }),
});

export default function LifetimeSignupPage() {
  const { register: registerUser } = useUser();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [codes, setCodes] = useState<string[]>([""]);
  const [validationResults, setValidationResults] = useState<
    Array<{ code: string; valid: boolean; message: string }>
  >([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
    setError,
    clearErrors,
  } = useForm({
    resolver: zodResolver(lifetimeSignupSchema),
    defaultValues: {
      appSumoCodes: [""],
    },
  });

  const validateCodes = async (codes: string[]) => {
    setIsValidating(true);
    try {
      const response = await fetch("/api/validate-appsumo-codes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ codes: codes.filter((code) => code.trim()) }),
      });

      const data = await response.json();
      setValidationResults(data.results);

      if (!data.success) {
        setError("appSumoCodes", {
          type: "manual",
          message: data.message,
        });
        return false;
      }

      clearErrors("appSumoCodes");
      toast({
        title: "Success",
        description: data.message,
      });
      return true;
    } catch (error) {
      console.error("Code validation error:", error);
      setError("appSumoCodes", {
        type: "manual",
        message: "Failed to validate codes",
      });
      return false;
    } finally {
      setIsValidating(false);
    }
  };

  const addCodeField = () => {
    if (codes.length < 3) {
      setCodes([...codes, ""]);
      setValidationResults([]);
    }
  };

  const removeCodeField = (index: number) => {
    if (codes.length > 1) {
      const newCodes = codes.filter((_, i) => i !== index);
      setCodes(newCodes);
      setValidationResults([]);
    }
  };

  const onSubmit = async (data: any) => {
    setIsLoading(true);
    try {
      const codesToValidate = data.appSumoCodes.filter((code: string) => code.trim());
      if (codesToValidate.length === 0) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "At least one AppSumo code is required",
        });
        return;
      }

      const validationResult = await validateCodes(codesToValidate);
      if (!validationResult) {
        setIsLoading(false);
        return;
      }

      const result = await registerUser({
        username: data.username,
        password: data.password,
        email: data.email,
        fullName: `${data.firstName} ${data.lastName}`,
        appSumoCodes: codesToValidate,
        provider: 'appsumo'
      });

      if (result.ok) {
        toast({
          title: "Success",
          description: "Account created successfully! Welcome aboard.",
        });
        await new Promise((resolve) => setTimeout(resolve, 200));
        setLocation("/dashboard");
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.message,
        });
      }
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

  return (
    <>
      <Header />
      <div className="min-h-screen flex items-center justify-center relative bg-background">
        <img
          src={Form}
          alt="background"
          className="absolute inset-0 w-full h-full object-cover opacity-30 dark:opacity-20"
        />
        <div className="container max-w-md px-6 py-16 relative z-10">
          <div className="p-6 md:p-8 rounded-xl space-y-4 bg-card border border-border shadow-lg dark:bg-card">
            <div className="grid grid-cols-2 text-center rounded-[10px] overflow-hidden">
              <div className="py-3 text-primary-foreground bg-primary">
                Lifetime Access
              </div>
              <Button
                variant="ghost"
                className="py-3 text-foreground bg-muted hover:bg-muted/90 transition-colors"
                onClick={() => setLocation("/signup")}
              >
                Regular Signup
              </Button>
            </div>

            <div className="mx-auto w-full">
              <h2 className="!my-8 text-2xl font-medium text-center">
                AppSumo Lifetime Access
              </h2>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="font-medium text-[#666666]">
                      AppSumo Codes
                    </label>
                    {codes.length < 3 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addCodeField}
                        className="text-xs"
                      >
                        Add Another Code
                      </Button>
                    )}
                  </div>
                  {codes.map((_, index) => (
                    <div key={index} className="flex gap-2">
                      <div className="flex-1 space-y-1">
                        <Input
                          {...register(`appSumoCodes.${index}`)}
                          type="text"
                          placeholder={`Enter AppSumo code ${index + 1}`}
                          className={`rounded-md p-2.5 border ${
                            validationResults[index]?.valid === false
                              ? "border-destructive"
                              : validationResults[index]?.valid
                                ? "border-green-500"
                                : "border-[#66666659]"
                          }`}
                          onBlur={() => {
                            const currentCodes =
                              getValues().appSumoCodes.filter((code) =>
                                code.trim(),
                              );
                            if (currentCodes.length > 0) {
                              validateCodes(currentCodes);
                            }
                          }}
                        />
                        {validationResults[index] && (
                          <p
                            className={`text-sm ${
                              validationResults[index].valid
                                ? "text-green-500"
                                : "text-destructive"
                            }`}
                          >
                            {validationResults[index].message}
                          </p>
                        )}
                      </div>
                      {codes.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeCodeField(index)}
                          className="text-destructive"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  {errors.appSumoCodes && (
                    <p className="text-sm text-red-500">
                      {errors.appSumoCodes.message}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    <br />
                    • 1 code: Starter Plan
                    <br />
                    • 2 codes: Growth Plan
                    <br />• 3 codes: Professional Plan
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="grid gap-2">
                    <label htmlFor="firstName" className="font-medium text-[#666666]">
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
                    <label htmlFor="lastName" className="font-medium text-[#666666]">
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
                  <label htmlFor="email" className="font-medium text-[#666666]">
                    Email Address
                  </label>
                  <Input
                    {...register("email")}
                    type="email"
                    id="email"
                    className="rounded-md p-2.5 border border-[#66666659]"
                  />
                  {errors.email && (
                    <p className="text-sm text-red-500">{errors.email.message}</p>
                  )}
                </div>

                <div className="grid gap-2">
                  <label htmlFor="username" className="font-medium text-[#666666]">
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
                  <label htmlFor="password" className="font-medium text-[#666666]">
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
                    <label htmlFor="terms" className="text-sm text-muted-foreground">
                      I agree to the{" "}
                      <Button
                        variant="link"
                        className="h-auto p-0 text-primary"
                        onClick={() => setLocation("/terms")}
                      >
                        Terms of Service
                      </Button>{" "}
                      and{" "}
                      <Button
                        variant="link"
                        className="h-auto p-0 text-primary"
                        onClick={() => setLocation("/privacy-policy")}
                      >
                        Privacy Policy
                      </Button>
                    </label>
                  </div>
                  {errors.terms && (
                    <p className="text-sm text-red-500">{errors.terms.message}</p>
                  )}
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading || isValidating}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating Account...
                      </>
                    ) : isValidating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Validating Codes...
                      </>
                    ) : (
                      "Sign up"
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
