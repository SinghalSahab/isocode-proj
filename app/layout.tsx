import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Company A - Distributor Ordering",
  description: "FMCG distributor ordering application with AI order capture",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
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
      <head>
        <meta name="theme-color" content="#1F6F4A" />
      </head>
      <body className="min-h-screen bg-background text-ink antialiased">
        {children}
      </body>
    </html>
  );
}
