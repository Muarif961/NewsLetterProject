import { Route, Switch } from "wouter";
import LoginPage from "@/pages/auth/login";
import SignupPage from "@/pages/auth/signup";
import LifetimeSignupPage from "@/pages/auth/lifetime-signup";
import ResetPasswordPage from "@/pages/auth/reset-password";
import Dashboard from "@/pages/dashboard";
import LandingPage from "@/pages/landing";
import Newsletters from "@/pages/newsletters";
import Subscribers from "@/pages/subscribers";
import Templates from "@/pages/templates";
import Settings from "@/pages/settings";
import PricingPage from "@/pages/pricing";
import PrivacyPolicy from "@/pages/privacy-policy";
import Terms from "@/pages/terms";
import Features from "@/pages/features";
import Editor from "@/pages/editor";
import ContentEditor from "@/pages/editor/content";
import Forms from "@/pages/forms";
import UnsubscribePage from "@/pages/unsubscribe";
import CreditsPage from "@/pages/credits";
import { useUser } from "./hooks/use-user";
import { OnboardingProvider } from "./components/onboarding/OnboardingProvider";
import "./components/onboarding/onboarding.css";
import { ThemeProvider } from './components/theme-provider';
import { SWRConfig } from 'swr';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

function PrivateRoute({ component: Component, ...rest }: any) {
  const { user, isLoading } = useUser();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    window.location.href = "/login";
    return null;
  }

  return <Component {...rest} />;
}

function App() {
  const fetcher = (...args: any) => fetch(...args).then((res) => res.json());
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <SWRConfig value={{ fetcher }}>
          <div className="min-h-screen">
            <Switch>
              <Route path="/" component={LandingPage} />
              <Route path="/login" component={LoginPage} />
              <Route path="/signup" component={SignupPage} />
              <Route path="/signup/lifetime" component={LifetimeSignupPage} />
              <Route path="/reset-password" component={ResetPasswordPage} />
              <Route path="/dashboard">
                <PrivateRoute component={Dashboard} />
              </Route>
              <Route path="/editor">
                <PrivateRoute component={Editor} />
              </Route>
              <Route path="/editor/content">
                <PrivateRoute component={ContentEditor} />
              </Route>
              <Route path="/newsletters">
                <PrivateRoute component={Newsletters} />
              </Route>
              <Route path="/templates">
                <PrivateRoute component={Templates} />
              </Route>
              <Route path="/subscribers">
                <PrivateRoute component={Subscribers} />
              </Route>
              {/* Legacy forms route maintained for backward compatibility */}
              <Route path="/forms">
                <PrivateRoute component={Forms} />
              </Route>
              <Route path="/settings">
                <PrivateRoute component={Settings} />
              </Route>
              <Route path="/credits">
                <PrivateRoute component={CreditsPage} />
              </Route>
              <Route path="/credits/success">
                <PrivateRoute component={CreditsPage} />
              </Route>
              <Route path="/credits/canceled">
                <PrivateRoute component={CreditsPage} />
              </Route>
              <Route path="/privacy-policy" component={PrivacyPolicy} />
              <Route path="/terms" component={Terms} />
              <Route path="/pricing" component={PricingPage} />
              <Route path="/features" component={Features} />
              <Route path="/unsubscribe" component={UnsubscribePage} />
              <Route>404 Page Not Found</Route>
            </Switch>
          </div>
        </SWRConfig>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;