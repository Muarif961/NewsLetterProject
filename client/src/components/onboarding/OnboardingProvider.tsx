import React, { useEffect, useState } from "react";
import { OnboardingTooltip } from "./OnboardingTooltip";
import { useOnboarding, onboardingSteps } from "@/hooks/use-onboarding";
import { useUser } from "@/hooks/use-user";

// Define a background overlay for the onboarding tour
function OnboardingOverlay() {
  return (
    <div className="fixed inset-0 bg-black/50 z-40 pointer-events-none" />
  );
}

// The actual component that shows the tooltips
function OnboardingContent() {
  const [mounted, setMounted] = useState(false);
  const [shouldShow, setShouldShow] = useState(false);
  const [currentStep, setCurrentStep] = useState(onboardingSteps[0]);
  const [isFirst, setIsFirst] = useState(true);
  const [isLast, setIsLast] = useState(false);
  
  const onboarding = useOnboarding();
  const { user } = useUser();
  
  // Initialize state when component mounts
  useEffect(() => {
    setMounted(true);
    
    // Setup subscribe to state changes
    const unsubscribe = onboarding.subscribe(() => {
      setShouldShow(onboarding.getIsVisible());
      
      const activeIndex = onboarding.getActiveStepIndex();
      setCurrentStep(onboarding.getSteps()[activeIndex]);
      
      setIsFirst(activeIndex === 0);
      setIsLast(activeIndex === onboarding.getSteps().length - 1);
    });
    
    return () => {
      unsubscribe();
    };
  }, []);
  
  // Start onboarding automatically for first-time users
  useEffect(() => {
    if (!mounted) return;
    
    // For new users or returning users with firstTime flag, start the onboarding tour
    const shouldStartOnboarding = (
      user && 
      (onboarding.getIsNewUserSession() || onboarding.getIsFirstTime()) && 
      !onboarding.getIsCompleted()
    );
    
    if (shouldStartOnboarding) {
      // Short delay to ensure everything is loaded
      const timer = setTimeout(() => {
        console.log("Starting onboarding tour automatically...");
        onboarding.startOnboarding();
        
        // Mark that user has seen the onboarding unless restarted manually
        if (!onboarding.getIsCompleted()) {
          onboarding.setFirstTime(false);
        }
      }, 1500); // Slightly longer delay to ensure UI is fully loaded
      
      return () => clearTimeout(timer);
    }
  }, [user, mounted]);
  
  if (!mounted || !shouldShow || !currentStep) {
    return null;
  }
  
  return (
    <>
      <OnboardingOverlay />
      <OnboardingTooltip
        open={shouldShow}
        target={currentStep.target}
        title={currentStep.title}
        description={currentStep.description}
        placement={currentStep.placement || "bottom"}
        onClose={() => onboarding.endOnboarding()}
        onNext={() => onboarding.nextStep()}
        onPrevious={() => onboarding.previousStep()}
        nextButtonText={currentStep.nextButtonText}
        previousButtonText={currentStep.previousButtonText}
        isFirst={isFirst}
        isLast={isLast}
        highlightTarget={currentStep.highlightTarget}
      />
    </>
  );
}

// The provider that wraps our app
export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <OnboardingContent />
    </>
  );
}

// Add helper to manually trigger onboarding
export function TriggerOnboarding({ children }: { children: React.ReactNode }) {
  const onboarding = useOnboarding();
  
  return (
    <div onClick={() => onboarding.startOnboarding()}>
      {children}
    </div>
  );
}