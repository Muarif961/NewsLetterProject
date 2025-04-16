import React, { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import { ErrorBoundary } from "../components/error-boundary";

// Lazy load components with explicit loading states
const Header = lazy(() => import("../components/landing/Header"));
const Hero = lazy(() => import("@/components/landing/Hero")); 
const Features = lazy(() => import("@/components/landing/Features"));
const Testimonials = lazy(() => import("@/components/landing/Testimonials"));
const Roadmap = lazy(() => import("@/components/landing/Roadmap"));
const Footer = lazy(() => import("@/components/landing/Footer"));

// Loading component with subtle animation
const LoadingComponent = ({ height = "h-20" }: { height?: string }) => (
  <div className={`${height} flex items-center justify-center`}>
    <Loader2 className="h-8 w-8 animate-spin text-white/50" />
  </div>
);

export default function LandingPage() {
  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-purple-900 via-purple-800 to-purple-900 dark:from-purple-950 dark:via-purple-900 dark:to-purple-950 text-white">
      <div className="relative overflow-hidden w-full">
        <div 
          className="absolute inset-0 bg-repeat opacity-10"
          style={{ 
            backgroundImage: `url('/grid-pattern.svg')`,
            backgroundSize: '30px 30px',
            transform: 'translate3d(0, 0, 0)', // Force GPU acceleration
          }} 
        />
        <div className="relative w-full pt-[80px]">
          <ErrorBoundary>
            <Suspense fallback={<LoadingComponent />}>
              <Header />
            </Suspense>
          </ErrorBoundary>

          <ErrorBoundary>
            <Suspense fallback={<LoadingComponent height="h-[600px]" />}>
              <Hero />
            </Suspense>
          </ErrorBoundary>

          <ErrorBoundary>
            <Suspense fallback={<LoadingComponent height="h-96" />}>
              <Features />
            </Suspense>
          </ErrorBoundary>

          <ErrorBoundary>
            <Suspense fallback={<LoadingComponent height="h-96" />}>
              <Testimonials />
            </Suspense>
          </ErrorBoundary>

          <ErrorBoundary>
            <Suspense fallback={<LoadingComponent height="h-96" />}>
              <Roadmap />
            </Suspense>
          </ErrorBoundary>

          <ErrorBoundary>
            <Suspense fallback={<LoadingComponent />}>
              <Footer />
            </Suspense>
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
}