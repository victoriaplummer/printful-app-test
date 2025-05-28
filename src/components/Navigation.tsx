"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "@/hooks/useSession";
import ThemeToggle from "./ThemeToggle";

export default function Navigation() {
  const pathname = usePathname();
  const { sessionId, isFullyConnected, clearTokens } = useSession();

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
            {sessionId && (
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
          {sessionId && (
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
        {sessionId && (
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
            <div className="avatar placeholder">
              <div className="bg-neutral text-neutral-content rounded-full w-8">
                <span className="text-xs">S</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
