
import React from "react";
import { UserButton } from "@clerk/clerk-react";
import { NotificationBell } from "../notifications/NotificationBell";
import { ThemeToggle } from "../theme-toggle";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center px-4">
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end md:space-x-4 lg:space-x-6">
          <div className="flex items-center space-x-4">
            <NotificationBell />
            <ThemeToggle />
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </div>
    </header>
  );
}
