import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { ScrollArea } from "./scroll-area";
import { useIsMobile } from "../../hooks/use-mobile";
import { Sheet, SheetContent, SheetTrigger } from "./sheet";
import {
  LayoutDashboard,
  FileText,
  LayoutTemplate,
  Cog,
  Menu,
  Edit,
  X,
  FormInput,
} from "lucide-react";
import {FaUsers } from "react-icons/fa6";
import { useState } from "react";

const navigation = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    href: "/dashboard",
  },
  {
    title: "Newsletters",
    icon: FileText,
    href: "/newsletters",
  },
  {
    title: "Newsletter Editor",
    icon: Edit,
    href: "/editor/content",
    onboardingTarget: "editor",
  },
  {
    title: "Templates",
    icon: LayoutTemplate,
    href: "/templates",
  },
  {
    title: "Subscribers",
    icon: FaUsers,
    href: "/subscribers",
    onboardingTarget: "subscribers",
  },
  {
    title: "Forms",
    icon: FormInput,
    href: "/forms",
  },
];

interface SidebarNavProps extends React.HTMLAttributes<HTMLElement> {
  className?: string;
}

export function Sidebar({ className }: SidebarNavProps) {
  const [location] = useLocation();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center justify-center px-6 mt-8">
        <img
          src="/Mailer-Logo1.png"
          alt="Newsletterly"
          className="h-29 w-auto"
          loading="eager"
        />
      </div>
      <ScrollArea className="flex-1 px-4 py-6 mt-10">
        <nav className="flex flex-col gap-2 mt-8">
          {navigation.map((item) => (
            <Link key={item.href} href={item.href}>
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start gap-3 text-sm font-medium transition-all duration-200 shadow-none",
                  location === item.href
                    ? "bg-[#6054d6] hover:bg-[#6054d6]/90 text-white"
                    : "hover:bg-[#6054d6]/10 hover:text-[#6054d6]",
                )}
                onClick={() => setOpen(false)}
                data-onboarding-target={item.onboardingTarget || null}
              >
                <item.icon className="h-4 w-4" />
                {item.title}
              </Button>
            </Link>
          ))}
        </nav>
      </ScrollArea>

      {/* Settings button at the bottom */}
      <div className="mx-4 py-4">
        <div className="border-t mb-2" />
        <Link href="/settings">
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start gap-3 text-sm font-medium transition-all duration-200 shadow-none",
              location === "/settings"
                ? "bg-[#6054d6] hover:bg-[#6054d6]/90 text-white"
                : "hover:bg-[#6054d6]/10 hover:text-[#6054d6]",
            )}
            onClick={() => setOpen(false)}
            data-onboarding-target="settings"
          >
            <Cog className="h-4 w-4" />
            Settings
          </Button>
        </Link>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <>
        <Button
          variant="ghost"
          size="icon"
          className="fixed left-4 top-4 z-40 md:hidden"
          onClick={() => setOpen(true)}
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="left" className="w-72 p-0">
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-4"
              onClick={() => setOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
            <SidebarContent />
          </SheetContent>
        </Sheet>
      </>
    );
  }

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-30 hidden w-72 border-r bg-background/80 backdrop-blur-xl md:block",
        className,
      )}
    >
      <SidebarContent />
    </aside>
  );
}