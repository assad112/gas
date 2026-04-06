import { useContext } from "react";

import { OrdersContext } from "@/components/providers/orders-provider";

export function useAdmin() {
  const context = useContext(OrdersContext);

  if (!context) {
    throw new Error("useAdmin must be used within OrdersProvider.");
  }

  return context;
}
