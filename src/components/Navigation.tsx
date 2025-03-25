"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "./ThemeToggle";

export default function Navigation() {
  const { data: session } = useSession();
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  const handleSignOut = async () => {
    if (session?.printfulAccessToken && session?.webflowAccessToken) {
      if (
        !confirm("This will disconnect both Printful and Webflow. Continue?")
      ) {
        return;
      }
    }
    await signOut();
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
            {session && (
              <li>
                <Link href="/account">Account</Link>
              </li>
            )}
          </ul>
        </div>
        <Link href="/" className="btn btn-ghost text-xl">
          Printful App
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
          {session && (
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
        {session ? (
          <button onClick={handleSignOut} className="btn btn-ghost ml-2">
            Sign out
          </button>
        ) : (
          <Link href="/api/auth/signin" className="btn btn-ghost ml-2">
            Sign in
          </Link>
        )}
      </div>
    </div>
  );
}
