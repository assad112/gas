import { cookies } from "next/headers";
import { Cairo, Plus_Jakarta_Sans } from "next/font/google";

import AppProviders from "@/components/providers/app-providers";

import "./globals.css";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-cairo",
  weight: ["400", "500", "600", "700", "800"]
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  weight: ["400", "500", "600", "700", "800"]
});

export const metadata = {
  title: "Super Gas Admin Dashboard",
  description:
    "Premium bilingual admin dashboard for gas cylinder orders, drivers, customers, and operations."
};

function resolveLocale(locale) {
  return locale === "en" ? "en" : "ar";
}

export default async function RootLayout({ children }) {
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get("gas-admin-locale")?.value);
  const direction = locale === "ar" ? "rtl" : "ltr";

  return (
    <html lang={locale} dir={direction} suppressHydrationWarning>
      <body
        className={`${cairo.variable} ${jakarta.variable} font-sans selection:bg-brand-200/70 selection:text-brand-900`}
      >
        <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute end-0 top-0 h-[28rem] w-[28rem] rounded-full bg-brand-200/40 blur-3xl" />
          <div className="absolute bottom-0 start-0 h-[24rem] w-[24rem] rounded-full bg-ocean-200/40 blur-3xl" />
          <div className="absolute inset-0 bg-dashboard-grid bg-[size:42px_42px] opacity-[0.16]" />
        </div>

        <AppProviders initialLocale={locale}>{children}</AppProviders>
      </body>
    </html>
  );
}

