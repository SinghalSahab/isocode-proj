import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Company A - Distributor Ordering",
  description: "FMCG distributor ordering application with AI order capture",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#1F6F4A",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = cookies();
  const lang = cookieStore.get("app_lang")?.value || "en";

  return (
    <html lang={lang}>
      <body className="min-h-screen bg-background text-ink antialiased">
        {children}
      </body>
    </html>
  );
}
