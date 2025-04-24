import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/Providers";
import Navigation from "@/components/Navigation";
import { Analytics } from "@vercel/analytics/react";

export const metadata: Metadata = {
  title: "Printful OAuth App",
  description: "A simple app to authenticate with Printful",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <Providers>
          <Analytics />
          <Navigation />
          {children}
        </Providers>
      </body>
    </html>
  );
}
