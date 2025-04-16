import { useState } from "react";
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

const loginSchema = z.object({
  username: z.string().min(1, "Username or email is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login } = useUser();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      const result = await login(data);
      if (result.ok) {
        await new Promise(resolve => setTimeout(resolve, 200));
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

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter your email address",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setResetSent(true);
        toast({
          title: "Success",
          description: "Password reset instructions have been sent to your email",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: data.message,
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to send reset instructions",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Header/>
      <div className="min-h-screen flex items-center justify-center relative bg-background">
        <img
          src={Form}
          alt="background"
          className="absolute inset-0 w-full h-full object-cover opacity-30 dark:opacity-20"
        />
        <div className="container max-w-md px-6 py-16 relative z-10">
          <div
            className="p-6 md:p-8 rounded-xl space-y-4 bg-card border border-border shadow-lg dark:bg-card"
          >
            <div className="grid grid-cols-2 text-center rounded-[10px] overflow-hidden">
              <Link
                href="/signup"
                className="py-3 text-foreground bg-muted hover:bg-muted/90 transition-colors"
              >
                Sign up
              </Link>
              <div className="py-3 text-primary-foreground bg-primary">Log in</div>
            </div>

            <div className="mx-auto w-full">
              <h2 className="!my-8 text-2xl font-medium text-center">Log in</h2>

              {!showForgotPassword ? (
                <>
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid gap-2">
                      <label
                        htmlFor="username"
                        className="font-medium text-[#666666]"
                      >
                        Username or Email
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

                    <Button
                      type="submit"
                      className="justify-center w-full"
                      disabled={isLoading}
                    >
                      {isLoading ? "Loading..." : "Log in"}
                    </Button>

                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(true)}
                      className="text-sm text-primary hover:underline w-full text-center"
                    >
                      Forgot Password?
                    </button>
                  </form>
                </>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-6">
                  <h3 className="text-lg font-medium text-center">Reset Password</h3>

                  {resetSent ? (
                    <div className="text-center space-y-4">
                      <p className="text-green-600">
                        Check your email for password reset instructions
                      </p>
                      <Button
                        type="button"
                        onClick={() => {
                          setShowForgotPassword(false);
                          setResetSent(false);
                        }}
                        className="justify-center"
                      >
                        Back to Login
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="grid gap-2">
                        <label
                          htmlFor="email"
                          className="font-medium text-[#666666]"
                        >
                          Email Address
                        </label>
                        <Input
                          type="email"
                          id="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="rounded-md p-2.5 border border-[#66666659]"
                          required
                        />
                      </div>

                      <div className="space-y-4">
                        <Button
                          type="submit"
                          className="justify-center w-full"
                          disabled={isLoading}
                        >
                          {isLoading ? "Sending..." : "Send Reset Instructions"}
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowForgotPassword(false)}
                          className="justify-center w-full"
                        >
                          Back to Login
                        </Button>
                      </div>
                    </>
                  )}
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
