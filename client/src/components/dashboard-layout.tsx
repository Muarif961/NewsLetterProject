import { ReactNode } from "react";
import { Sidebar } from "./ui/sidebar";
import { Button } from "./ui/button";
import { User, Settings2, CreditCard, FileText, LogOut, Coins } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { NotificationBell } from "./notifications/NotificationBell";
import { ThemeToggle } from "./theme-toggle";
import { CreditWidget } from "./credit-widget";
import { useUser } from "../hooks/use-user";
import { useState, useCallback } from "react";
import { SettingsModal } from "./settings-modal";
import { ProfileModal } from "./modals/profile-modal";
import { BillingModal } from "./modals/billing-modal";
import { DocumentationModal } from "./modals/documentation-modal";
import { useLocation } from "wouter";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, logout } = useUser();
  const [, setLocation] = useLocation();
  const [showSettings, setShowSettings] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showBilling, setShowBilling] = useState(false);
  const [showDocs, setShowDocs] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  
  // Helper function to navigate
  const navigate = (path: string) => setLocation(path);

  // Function to handle modal openings with proper cleanup
  const handleModalOpen = useCallback((modalSetter: (open: boolean) => void) => {
    // First close dropdown to prevent stacking issues
    setDropdownOpen(false);
    // Small delay to ensure dropdown is closed before modal opens
    setTimeout(() => {
      modalSetter(true);
    }, 10);
  }, []);

  // Unified modal state handler
  const handleModalClose = useCallback((modalSetter: (open: boolean) => void) => {
    modalSetter(false);
    // Ensure dropdown is also closed when modal closes
    setDropdownOpen(false);
  }, []);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-y-auto pl-72 pt-10">
        <div className="fixed top-0.5 right-0 z-40 flex items-center justify-end gap-4 p-4 bg-background/95 backdrop-blur w-[calc(100%-18rem)]">
          <div className="flex items-center gap-4">
            <p className="text-muted-foreground">
              Welcome back, {user?.fullName}
            </p>
            <div className="flex items-center gap-4 ml-auto">
              <CreditWidget
                variant="compact"
                onPurchaseClick={() => navigate("/credits")}
                onDetailsClick={() => navigate("/credits")}
              />
              <NotificationBell />
              <ThemeToggle />
              <DropdownMenu 
                open={dropdownOpen} 
                onOpenChange={setDropdownOpen}
              >
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative h-8 w-8 rounded-full"
                    data-onboarding-target="profile-icon"
                  >
                    <img
                      src={
                        user?.imageUrl ||
                        `https://api.dicebear.com/7.x/initials/svg?seed=${user?.fullName}`
                      }
                      alt="Profile"
                      className="h-8 w-8 rounded-full"
                    />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 p-2 z-50">
                  <DropdownMenuItem
                    className="cursor-pointer flex items-center gap-2 p-3 text-sm"
                    onSelect={(e) => {
                      e.preventDefault();
                      handleModalOpen(() => setShowProfile(true));
                    }}
                  >
                    <User className="h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer flex items-center gap-2 p-3 text-sm"
                    onSelect={(e) => {
                      e.preventDefault();
                      handleModalOpen(() => setShowBilling(true));
                    }}
                  >
                    <CreditCard className="h-4 w-4" />
                    Billing
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer flex items-center gap-2 p-3 text-sm"
                    onSelect={(e) => {
                      e.preventDefault();
                      setDropdownOpen(false);
                      navigate("/credits");
                    }}
                  >
                    <Coins className="h-4 w-4" />
                    AI Credits
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer flex items-center gap-2 p-3 text-sm"
                    onSelect={(e) => {
                      e.preventDefault();
                      handleModalOpen(() => setShowDocs(true));
                    }}
                  >
                    <FileText className="h-4 w-4" />
                    Documentation
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer flex items-center gap-2 p-3 text-sm"
                    onSelect={(e) => {
                      e.preventDefault();
                      handleModalOpen(() => setShowSettings(true));
                    }}
                    data-onboarding-target="settings"
                  >
                    <Settings2    className="h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="cursor-pointer flex items-center gap-2 p-3 text-sm"
                    onSelect={(e) => {
                      e.preventDefault();
                      setDropdownOpen(false);
                      
                      // Clear editor session flag to ensure blank template on next login
                      localStorage.removeItem("editor_session_active");
                      
                      // Perform the logout action
                      logout();
                    }}
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
        <div className="mt-16 max-w-[1920px] mx-auto px-6">
          <div className="max-w-[1400px] mx-auto">
            {children}
          </div>
        </div>
      </main>
      <SettingsModal 
        open={showSettings} 
        onOpenChange={(open) => {
          handleModalClose(() => setShowSettings(open));
        }} 
      />
      <ProfileModal 
        open={showProfile} 
        onOpenChange={(open) => {
          handleModalClose(() => setShowProfile(open));
        }} 
      />
      <BillingModal 
        open={showBilling} 
        onOpenChange={(open) => {
          handleModalClose(() => setShowBilling(open));
        }} 
      />
      <DocumentationModal 
        open={showDocs} 
        onOpenChange={(open) => {
          handleModalClose(() => setShowDocs(open));
        }} 
      />
    </div>
  );
}