// app/layout.tsx
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";

import "@workspace/ui/globals.css";
import { Providers } from "@/components/providers";
import { Toaster } from "@workspace/ui/components/sonner";
import ThemeProviderClient from "@/modules/customization/ui/components/ThemeProviderClient";

const fontSans = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
});

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${fontSans.variable} ${fontMono.variable} font-sans antialiased`}>
        <ClerkProvider
          appearance={{
            variables: {
              colorPrimary: "#2563EB",
            },
          }}
        >
          {/* ThemeProviderClient is client-side and safe to mount inside your server layout */}
          <ThemeProviderClient>
            <Providers>
              <Toaster />
              {children}
            </Providers>
          </ThemeProviderClient>
        </ClerkProvider>
      </body>
    </html>
  );
}
