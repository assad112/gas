"use client";

import { Phone, ShoppingBag, Users } from "lucide-react";

import StatsCard from "@/components/dashboard/stats-card";
import EmptyState from "@/components/shared/empty-state";
import ErrorState from "@/components/shared/error-state";
import LoadingSpinner from "@/components/shared/loading-spinner";
import UsersTable from "@/components/users/users-table";
import { useAdmin } from "@/hooks/use-admin";
import { useI18n } from "@/hooks/use-i18n";

export default function UsersPage() {
  const {
    customers,
    resources,
    refreshCustomers,
    resetCustomerPassword,
    deleteCustomer,
    customerMutationIds
  } = useAdmin();
  const { locale } = useI18n();

  const totalOrders = customers.reduce(
    (total, customer) => total + customer.ordersCount,
    0
  );
  const customersWithOrders = customers.filter((customer) => customer.ordersCount > 0);

  if (resources.customers.loading && customers.length === 0) {
    return (
      <LoadingSpinner
        label={locale === "en" ? "Loading customers..." : "جاري تحميل العملاء..."}
      />
    );
  }

  if (resources.customers.error && customers.length === 0) {
    return (
      <ErrorState
        title={locale === "en" ? "Unable to load customers" : "تعذر تحميل العملاء"}
        description={resources.customers.error}
        actionLabel={locale === "en" ? "Retry" : "إعادة المحاولة"}
        onAction={() => refreshCustomers()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <section className="panel-surface p-6 lg:p-8">
        <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
          {locale === "en" ? "Customer administration" : "إدارة العملاء"}
        </span>
        <h1 className="mt-3 text-2xl font-extrabold text-slate-900 lg:text-3xl">
          {locale === "en"
            ? "Customers connected to real accounts"
            : "العملاء المرتبطون بحسابات حقيقية"}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-500">
          {locale === "en"
            ? "This screen reads directly from registered customers and their order history, instead of demo user rows."
            : "هذه الشاشة تقرأ مباشرة من العملاء المسجلين وسجل طلباتهم بدل صفوف المستخدمين التجريبية."}
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <StatsCard
          title={locale === "en" ? "Total Customers" : "إجمالي العملاء"}
          value={customers.length}
          subtitle={
            locale === "en"
              ? "Registered customers in the backend."
              : "العملاء المسجلون داخل الـ backend."
          }
          icon={Users}
          tone="slate"
        />
        <StatsCard
          title={locale === "en" ? "Total Orders" : "إجمالي الطلبات"}
          value={totalOrders}
          subtitle={
            locale === "en"
              ? "Orders linked to customer accounts."
              : "الطلبات المرتبطة بحسابات العملاء."
          }
          icon={ShoppingBag}
          tone="amber"
        />
        <StatsCard
          title={locale === "en" ? "Reachable Customers" : "العملاء المتاحون للتواصل"}
          value={customersWithOrders.length}
          subtitle={
            locale === "en"
              ? "Customers with recorded order activity."
              : "عملاء لديهم نشاط طلبات مسجل."
          }
          icon={Phone}
          tone="teal"
        />
      </section>

      {customers.length === 0 ? (
        <EmptyState
          title={locale === "en" ? "No customers yet" : "لا يوجد عملاء بعد"}
          description={
            locale === "en"
              ? "Customer management is wired to the real backend. Registered mobile users will appear here automatically."
              : "إدارة العملاء مرتبطة بالـ backend الحقيقي. سيظهر هنا مستخدمو التطبيق المسجلون تلقائيًا."
          }
        />
      ) : (
        <UsersTable
          users={customers}
          onResetPassword={resetCustomerPassword}
          onDeleteUser={deleteCustomer}
          mutationIds={customerMutationIds}
        />
      )}
    </div>
  );
}
