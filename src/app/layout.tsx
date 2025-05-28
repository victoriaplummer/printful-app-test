import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import Providers from "@/components/Providers";
import Navigation from "@/components/Navigation";
import { Analytics } from "@vercel/analytics/react";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Printful Webflow Sync",
  description: "Sync Printful products to Webflow ecommerce",
};

// Check if we have valid Clerk keys
const hasValidClerkKeys = () => {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  return publishableKey && publishableKey !== "your_clerk_publishable_key_here";
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const content = (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className={`${geist.variable} ${geistMono.variable} antialiased`}>
        <Providers>
          <Analytics />
          {hasValidClerkKeys() ? (
            <Navigation />
          ) : (
            <div className="navbar bg-base-200">
              <div className="navbar-start">
                <span className="btn btn-ghost text-xl">
                  Printful-Webflow Sync
                </span>
              </div>
              <div className="navbar-end">
                <div className="alert alert-warning">
                  <span>
                    Please configure Clerk keys to enable authentication
                  </span>
                </div>
              </div>
            </div>
          )}
          {children}
        </Providers>
      </body>
    </html>
  );

  // Only wrap with ClerkProvider if we have valid keys
  if (hasValidClerkKeys()) {
    return (
      <ClerkProvider
        publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
        signInUrl="/cosmic/sign-in"
        signUpUrl="/cosmic/sign-up"
        afterSignInUrl="/cosmic"
        afterSignUpUrl="/cosmic"
      >
        {content}
      </ClerkProvider>
    );
  }

  return content;
}
