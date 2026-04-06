"use client";

import { Toaster } from "react-hot-toast";

import { I18nProvider } from "@/components/providers/i18n-provider";
import { OrdersProvider } from "@/components/providers/orders-provider";

export default function AppProviders({ children, initialLocale }) {
  return (
    <I18nProvider initialLocale={initialLocale}>
      <OrdersProvider>
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3000,
            style: {
              borderRadius: "18px",
              background: "#0f172a",
              color: "#fff",
              boxShadow: "0 20px 45px rgba(15, 23, 42, 0.18)"
            }
          }}
        />
      </OrdersProvider>
    </I18nProvider>
  );
}
