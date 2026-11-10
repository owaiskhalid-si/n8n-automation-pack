import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Urbanist } from "next/font/google";
import { ThemeProvider } from "@/components/theme";
import { SiteFooter, SiteHeader } from "@/components/site";
import { site } from "@/lib/site";
import "./globals.css";

// Urbanist carries the whole interface; Inter only sets tiny caps labels; the monospace is for code and JSON.
const urbanist = Urbanist({ variable: "--font-urbanist", subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const inter = Inter({ variable: "--font-inter", subsets: ["latin"], weight: "500" });
const mono = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"], weight: ["400", "500"] });

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: `${site.name} — n8n automation pack`, template: `%s · ${site.name}` },
  description: site.description,
  openGraph: { title: `${site.name} — n8n automation pack`, description: site.description, type: "website" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0b0b" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning className={`${urbanist.variable} ${inter.variable} ${mono.variable} h-full antialiased`}>
      <body className="min-h-full">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <div className="mx-auto w-full max-w-[1400px] p-5">
            <SiteHeader />
            <main>{children}</main>
            <SiteFooter />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
