// Simple onboarding state module

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  target: string; // CSS selector for the target element
  placement?: "top" | "right" | "bottom" | "left";
  nextButtonText?: string;
  previousButtonText?: string;
  highlightTarget?: boolean;
}

export const onboardingSteps: OnboardingStep[] = [
  {
    id: "verify-email",
    title: "Verify Your Email",
    description: "Click the profile icon in the top right corner, then select 'Settings' to verify your email. This is required before sending newsletters.",
    target: "[data-onboarding-target='profile-icon']", // Target the profile icon
    placement: "left",
    nextButtonText: "Next",
    highlightTarget: true
  },
  {
    id: "subscribers",
    title: "Add Subscribers",
    description: "Upload subscribers or embed a customizable form to collect subscribers.",
    target: "[data-onboarding-target='subscribers']", // We'll add this attribute to the subscribers section
    placement: "bottom",
    previousButtonText: "Back",
    nextButtonText: "Next",
    highlightTarget: true
  },
  {
    id: "create-newsletter",
    title: "Create Newsletters",
    description: "Start creating newsletters using our AI Email Generator or build custom emails in the rich text editor.",
    target: "[data-onboarding-target='editor']", // We'll add this attribute to the editor section
    placement: "bottom",
    previousButtonText: "Back",
    nextButtonText: "Next",
    highlightTarget: true
  },
  {
    id: "send-emails",
    title: "Send Emails",
    description: "Send emails in test mode to verify layouts or send officially to subscribers.",
    target: "[data-onboarding-target='send']", // We'll add this attribute to the send section
    placement: "bottom",
    previousButtonText: "Back",
    nextButtonText: "Finish",
    highlightTarget: true
  }
];

// Simple module-level state variables
let isFirstTime = true;
let completed = false;
let activeStepIndex = 0;
let isVisible = false;

// Flag to track if this is a new user session
let isNewUserSession = false;

// Initialize from localStorage if available
try {
  // Check if onboarding settings exist in localStorage
  const hasOnboardingSettings = localStorage.getItem('onboarding-first-time') !== null;
  
  // If no settings found, this could be a new user
  if (!hasOnboardingSettings) {
    isNewUserSession = true;
    // For new users, we want to ensure onboarding runs
    isFirstTime = true;
    completed = false;
  } else {
    // Load existing settings
    const storedFirstTime = localStorage.getItem('onboarding-first-time');
    if (storedFirstTime !== null) {
      isFirstTime = storedFirstTime === 'true';
    }
    
    const storedCompleted = localStorage.getItem('onboarding-completed');
    if (storedCompleted !== null) {
      completed = storedCompleted === 'true';
    }
  }
} catch (e) {
  console.error('Error accessing localStorage', e);
}

// For storing listeners
const listeners: (() => void)[] = [];

// For notifying components of changes
function notifyListeners() {
  listeners.forEach(listener => listener());
}

// Onboarding state management methods
export const onboardingState = {
  getIsFirstTime: () => isFirstTime,
  getIsCompleted: () => completed,
  getActiveStepIndex: () => activeStepIndex,
  getIsVisible: () => isVisible,
  getSteps: () => onboardingSteps,
  getCurrentStep: () => onboardingSteps[activeStepIndex],
  getIsNewUserSession: () => isNewUserSession,
  
  setFirstTime: (value: boolean) => {
    isFirstTime = value;
    try {
      localStorage.setItem('onboarding-first-time', String(value));
    } catch (e) {
      console.error('Error writing to localStorage', e);
    }
    notifyListeners();
  },
  
  startOnboarding: () => {
    isVisible = true;
    activeStepIndex = 0;
    notifyListeners();
  },
  
  endOnboarding: () => {
    isVisible = false;
    completed = true;
    try {
      localStorage.setItem('onboarding-completed', String(true));
    } catch (e) {
      console.error('Error writing to localStorage', e);
    }
    notifyListeners();
  },
  
  nextStep: () => {
    const newIndex = activeStepIndex + 1;
    if (newIndex >= onboardingSteps.length) {
      isVisible = false;
      completed = true;
      try {
        localStorage.setItem('onboarding-completed', String(true));
      } catch (e) {
        console.error('Error writing to localStorage', e);
      }
    } else {
      activeStepIndex = newIndex;
    }
    notifyListeners();
  },
  
  previousStep: () => {
    const newIndex = activeStepIndex - 1;
    if (newIndex < 0) {
      activeStepIndex = 0;
    } else {
      activeStepIndex = newIndex;
    }
    notifyListeners();
  },
  
  goToStep: (index: number) => {
    activeStepIndex = index < 0 ? 0 : (index >= onboardingSteps.length ? onboardingSteps.length - 1 : index);
    notifyListeners();
  },
  
  skipOnboarding: () => {
    isVisible = false;
    completed = true;
    try {
      localStorage.setItem('onboarding-completed', String(true));
    } catch (e) {
      console.error('Error writing to localStorage', e);
    }
    notifyListeners();
  },
  
  // Subscribe to state changes
  subscribe: (listener: () => void) => {
    listeners.push(listener);
    return () => {
      const index = listeners.indexOf(listener);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    };
  }
};

// This is what we'll export as the main hook
export function useOnboarding() {
  return onboardingState;
}