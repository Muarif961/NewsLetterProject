import React, { memo } from "react";
import { Link } from "wouter";
import { ThemeToggle } from "../../components/theme-toggle";
import logo from "../../assets/logo.svg";

// Memoized button component to prevent unnecessary re-renders
const Button = memo(
  ({
    children,
    className = "",
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button
      className={`px-4 py-2 bg-primary hover:bg-primary/90 transition-colors rounded-lg text-white font-semibold ${className}`}
      {...props}
    >
      {children}
    </button>
  ),
);

Button.displayName = "Button";

// Memoized link component
const NavLink = memo(
  ({ href, children }: { href: string; children: React.ReactNode }) => (
    <Link
      href={href}
      className="text-black dark:text-white hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
    >
      {children}
    </Link>
  ),
);

NavLink.displayName = "NavLink";

const Header = () => {
  // Add preload link for logo
  React.useEffect(() => {
    const preloadLink = document.createElement("link");
    preloadLink.rel = "preload";
    preloadLink.as = "image";
    preloadLink.href = logo;
    document.head.appendChild(preloadLink);

    return () => {
      document.head.removeChild(preloadLink);
    };
  }, []);

  return (
    <header className="bg-white dark:bg-[#0A0A0A] fixed top-0 left-0 right-0 z-50">
      <nav className="max-w-[1240px] mx-auto px-4 xl:px-6 py-5 md:py-6 w-full flex gap-3 justify-between items-center">
        <Link href="/">
          <picture>
            <img
              src={logo}
              alt="Newsletterly"
              className="w-[130px] md:w-[260px]"
              loading="eager"
              width="260"
              height="60"
              fetchpriority="high"
              decoding="sync"
              onError={(e) => {
                e.currentTarget.src = "/fallback-logo.svg";
              }}
            />
          </picture>
        </Link>
        <div className="flex gap-4 items-center">
          <div className="flex items-center gap-4">
            <NavLink href="/features">Features</NavLink>
            <span className="text-gray-300">|</span>
            <NavLink href="/pricing">Pricing Plans</NavLink>
            <span className="text-gray-300 max-md:!hidden">|</span>
            <NavLink href="/login">Login</NavLink>
            <Link href="/signup">
              <Button className="max-md:!hidden text-sm font-semibold px-6 py-3 rounded-full">Start Trial</Button>
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </nav>
    </header>
  );
};

export default memo(Header);