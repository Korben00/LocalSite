/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Metadata, Viewport } from "next";
import { Inter, PT_Sans } from "next/font/google";
import { cookies, headers } from "next/headers";

import TanstackProvider from "@/components/providers/tanstack-query-provider";
import "@/assets/globals.css";
import { Toaster } from "@/components/ui/sonner";
import MY_TOKEN_KEY from "@/lib/get-cookie-name";
// Use fetch on the server to call internal API
import AppContext from "@/components/contexts/app-context";


const inter = Inter({
  variable: "--font-inter-sans",
  subsets: ["latin"],
});

const ptSans = PT_Sans({
  variable: "--font-ptSans-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "LocalSite | Build locally with AI ✨",
  description:
    "LocalSite is a 100% local web development tool powered by Ollama. Build websites with AI running directly on your machine, no cloud required.",
  openGraph: {
    title: "LocalSite | Build locally with AI ✨",
    description:
      "LocalSite is a 100% local web development tool powered by Ollama. Build websites with AI running directly on your machine, no cloud required.",
    url: "http://localhost:3001",
    siteName: "LocalSite",
    images: [
      {
        url: "/banner.png",
        width: 1200,
        height: 630,
        alt: "LocalSite Open Graph Image",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "LocalSite | Build locally with AI ✨",
    description:
      "LocalSite is a 100% local web development tool powered by Ollama. Build websites with AI running directly on your machine, no cloud required.",
    images: ["/banner.png"],
  },
  appleWebApp: {
    capable: true,
    title: "LocalSite",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: "/logo.svg",
    shortcut: "/logo.svg",
    apple: "/logo.svg",
  },
};

export const viewport: Viewport = {
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#000000",
};

async function getMe() {
  const cookieStore = await cookies();
  const token = cookieStore.get(MY_TOKEN_KEY())?.value;
  if (!token) return { user: null, errCode: null };
  try {
    const h = await headers();
    const host = h.get("host") ?? "localhost:3000";
    const urlBase = `${host.includes("localhost") ? "http" : "https"}://${host}`;
    const res = await fetch(`${urlBase}/api/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) {
      return { user: null, errCode: res.status };
    }
    const data = await res.json();
    return { user: data.user, errCode: null };
  } catch (err: any) {
    return { user: null, errCode: err.status };
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const data = await getMe();
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${ptSans.variable} antialiased bg-black dark h-[100dvh] overflow-hidden`}
      >
        <Toaster richColors position="bottom-center" />
        <TanstackProvider>
          <AppContext me={data}>{children}</AppContext>
        </TanstackProvider>
      </body>
    </html>
  );
}
