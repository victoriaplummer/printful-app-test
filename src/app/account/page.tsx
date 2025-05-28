"use client";

import { useUser } from "@clerk/nextjs";
import { useOAuthTokens } from "@/lib/auth/clerk-oauth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AccountPage() {
  const { user, isSignedIn } = useUser();
  const { isFullyConnected } = useOAuthTokens();
  const router = useRouter();

  useEffect(() => {
    if (!isSignedIn) {
      router.push("/");
      return;
    }

    if (!isFullyConnected()) {
      router.push("/");
      return;
    }
  }, [isSignedIn, isFullyConnected, router]);

  if (!isSignedIn || !isFullyConnected()) {
    return <div>Redirecting...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Account</h1>
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">User Information</h2>
          <p>
            <strong>Email:</strong> {user?.emailAddresses?.[0]?.emailAddress}
          </p>
          <p>
            <strong>Name:</strong> {user?.fullName || "Not provided"}
          </p>
          <p>
            <strong>Account Status:</strong> Active
          </p>
        </div>
      </div>
    </div>
  );
}
