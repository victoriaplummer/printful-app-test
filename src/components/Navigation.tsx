"use client";

import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useOAuthTokens } from "@/lib/auth/clerk-oauth";
import ThemeToggle from "./ThemeToggle";

export default function Navigation() {
  const pathname = usePathname();

  // Safely handle OAuth tokens with error boundary
  let isSignedIn = false;
  let isFullyConnected = () => false;
  let clearTokens = async (provider: "webflow" | "printful") => {
    // Default implementation does nothing
    console.log(`Would clear ${provider} tokens if Clerk was available`);
  };

  try {
    const oauthHook = useOAuthTokens();
    isSignedIn = oauthHook.isSignedIn || false;
    isFullyConnected = oauthHook.isFullyConnected;
    clearTokens = oauthHook.clearTokens;
  } catch {
    // Clerk not available, use defaults
    console.log("Clerk not available, using default values");
  }

  const isActive = (path: string) => pathname === path;

  const handleDisconnectAll = async () => {
    if (isFullyConnected()) {
      if (
        !confirm("This will disconnect both Printful and Webflow. Continue?")
      ) {
        return;
      }
      await clearTokens("webflow");
      await clearTokens("printful");
    }
  };

  return (
    <div className="navbar bg-base-200">
      <div className="navbar-start">
        <div className="dropdown">
          <div tabIndex={0} role="button" className="btn btn-ghost lg:hidden">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 6h16M4 12h8m-8 6h16"
              />
            </svg>
          </div>
          <ul
            tabIndex={0}
            className="menu dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52"
          >
            <li>
              <Link href="/">Home</Link>
            </li>
            <li>
              <Link href="/products">Products</Link>
            </li>
            <li>
              <Link href="/auth-status">Auth Status</Link>
            </li>
            {isSignedIn && (
              <li>
                <Link href="/account">Account</Link>
              </li>
            )}
          </ul>
        </div>
        <Link href="/" className="btn btn-ghost text-xl">
          Printful-Webflow Sync
        </Link>
      </div>

      <div className="navbar-center hidden lg:flex">
        <ul className="menu menu-horizontal px-1">
          <li>
            <Link href="/" className={isActive("/") ? "active" : ""}>
              Home
            </Link>
          </li>
          <li>
            <Link
              href="/products"
              className={isActive("/products") ? "active" : ""}
            >
              Products
            </Link>
          </li>
          <li>
            <Link
              href="/auth-status"
              className={isActive("/auth-status") ? "active" : ""}
            >
              Auth Status
            </Link>
          </li>
          {isSignedIn && (
            <li>
              <Link
                href="/account"
                className={isActive("/account") ? "active" : ""}
              >
                Account
              </Link>
            </li>
          )}
        </ul>
      </div>

      <div className="navbar-end">
        <ThemeToggle />
        <SignedIn>
          <div className="flex items-center gap-2">
            {isFullyConnected() && (
              <button
                onClick={handleDisconnectAll}
                className="btn btn-ghost btn-sm"
                title="Disconnect OAuth services"
              >
                Disconnect
              </button>
            )}
            <UserButton />
          </div>
        </SignedIn>
        <SignedOut>
          <SignInButton mode="modal">
            <button className="btn btn-ghost ml-2">Sign in</button>
          </SignInButton>
        </SignedOut>
      </div>
    </div>
  );
}
