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
          <div className="absolute end-[-8rem] top-[-7rem] h-[34rem] w-[34rem] rounded-full bg-brand-200/50 blur-3xl" />
          <div className="absolute start-[-6rem] top-[18%] h-[22rem] w-[22rem] rounded-full bg-white/70 blur-3xl" />
          <div className="absolute bottom-[-8rem] start-[-5rem] h-[28rem] w-[28rem] rounded-full bg-ocean-200/45 blur-3xl" />
          <div className="absolute inset-x-0 top-[14%] mx-auto h-40 w-[78%] rounded-full bg-white/45 blur-3xl" />
          <div className="absolute inset-0 bg-dashboard-grid bg-[size:44px_44px] opacity-[0.14]" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.28),transparent_24%,transparent_76%,rgba(255,255,255,0.18))]" />
        </div>

        <AppProviders initialLocale={locale}>{children}</AppProviders>
      </body>
    </html>
  );
}
