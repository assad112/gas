"use client";

import { KeyRound, ShieldCheck, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { useI18n } from "@/hooks/use-i18n";
import { formatDateTime } from "@/lib/format";

function getCustomerName(user, locale) {
  return user.fullName || (locale === "en" ? "Customer" : "عميل");
}

export default function UsersTable({
  users,
  onResetPassword,
  onDeleteUser,
  mutationIds
}) {
  const { locale, isRTL } = useI18n();
  const [latestReset, setLatestReset] = useState(null);

  useEffect(() => {
    if (!latestReset) {
      return;
    }

    const stillExists = users.some(
      (user) => user.id === Number(latestReset.customerId)
    );

    if (!stillExists) {
      setLatestReset(null);
    }
  }, [latestReset, users]);

  async function handleResetPassword(user) {
    if (!onResetPassword) {
      return;
    }

    const customerName = getCustomerName(user, locale);
    const confirmMessage =
      locale === "en"
        ? `Reset password for ${customerName}? Active sessions will be signed out.`
        : `هل تريد إعادة تعيين كلمة مرور ${customerName}؟ سيتم تسجيل خروجه من الجلسات الحالية.`;

    if (typeof window !== "undefined" && !window.confirm(confirmMessage)) {
      return;
    }

    try {
      const result = await onResetPassword(user.id);
      const credentials = result?.credentials;

      if (!credentials) {
        return;
      }

      setLatestReset({
        customerId: user.id,
        customerName,
        identifier: credentials.identifier || user.phone || user.email || "--",
        temporaryPassword: credentials.temporaryPassword || ""
      });
    } catch {
      // Toast is handled by the provider.
    }
  }

  async function handleDeleteUser(user) {
    if (!onDeleteUser) {
      return;
    }

    const customerName = getCustomerName(user, locale);
    const confirmMessage =
      locale === "en"
        ? `Delete ${customerName}? Linked orders will remain in the system without the customer account.`
        : `هل تريد حذف ${customerName}؟ ستبقى الطلبات المرتبطة داخل النظام لكن بدون حساب العميل.`;

    if (typeof window !== "undefined" && !window.confirm(confirmMessage)) {
      return;
    }

    try {
      await onDeleteUser(user.id);
    } catch {
      // Toast is handled by the provider.
    }
  }

  function renderActionButtons(user) {
    const isBusy = Boolean(mutationIds?.[user.id]);

    return (
      <div className="flex min-w-0 flex-col gap-2 md:w-[220px]">
        <button
          type="button"
          disabled={isBusy || !onResetPassword}
          onClick={() => handleResetPassword(user)}
          className="button-secondary h-11 w-full justify-center whitespace-nowrap text-[13px]"
        >
          <KeyRound className="h-4 w-4" />
          {isBusy
            ? locale === "en"
              ? "Please wait..."
              : "يرجى الانتظار..."
            : locale === "en"
              ? "Reset Password"
              : "إعادة تعيين كلمة المرور"}
        </button>

        <button
          type="button"
          disabled={isBusy || !onDeleteUser}
          onClick={() => handleDeleteUser(user)}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 text-[13px] font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Trash2 className="h-4 w-4" />
          {isBusy
            ? locale === "en"
              ? "Please wait..."
              : "يرجى الانتظار..."
            : locale === "en"
              ? "Delete Customer"
              : "حذف العميل"}
        </button>
      </div>
    );
  }

  return (
    <section className="panel-surface overflow-hidden p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="eyebrow-label">
            {locale === "en" ? "Customers list" : "قائمة العملاء"}
          </p>
          <h2 className="mt-2 text-xl font-extrabold text-slate-900">
            {locale === "en" ? "Customers list" : "قائمة العملاء"}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-500">
            {locale === "en"
              ? "Control customer accounts directly from the admin dashboard, including password reset and account deletion."
              : "تحكم بحسابات العملاء مباشرة من لوحة الأدمن، بما في ذلك إعادة تعيين كلمة المرور وحذف الحساب."}
          </p>
        </div>
      </div>

      {latestReset ? (
        <div className="mt-6 rounded-[24px] border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-brand-50 p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
                {locale === "en"
                  ? "Customer password reset completed"
                  : "اكتملت إعادة تعيين كلمة مرور العميل"}
              </p>
              <h3 className="mt-2 text-base font-extrabold text-slate-900">
                {locale === "en"
                  ? `New login details for ${latestReset.customerName} (ID #${latestReset.customerId}).`
                  : `بيانات الدخول الجديدة للعميل ${latestReset.customerName} (رقم #${latestReset.customerId}).`}
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                {locale === "en"
                  ? "Share this temporary password with the customer. It is shown once after reset."
                  : "سلّم كلمة المرور المؤقتة للعميل. تظهر هنا مرة واحدة فقط بعد إعادة التعيين."}
              </p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-white/90 px-3 py-2 text-xs font-semibold text-amber-700">
              <ShieldCheck className="h-4 w-4" />
              {locale === "en" ? "Sessions revoked" : "تم إنهاء الجلسات"}
            </span>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-3">
              <p className="text-xs font-semibold text-slate-500">
                {locale === "en" ? "Login identifier" : "معرّف تسجيل الدخول"}
              </p>
              <p className="numeric-ltr mt-1 text-lg font-extrabold text-slate-900">
                {latestReset.identifier || "--"}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-3">
              <p className="text-xs font-semibold text-slate-500">
                {locale === "en" ? "Temporary password" : "كلمة المرور المؤقتة"}
              </p>
              <p className="numeric-ltr mt-1 text-lg font-extrabold text-slate-900">
                {latestReset.temporaryPassword || "--"}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 md:hidden">
        {users.map((user) => (
          <article
            key={`${user.id}-card`}
            className="rounded-[24px] border border-slate-100 bg-slate-50/80 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="break-words text-base font-bold text-slate-900">
                  {user.fullName}
                </h3>
                <p className="numeric-ltr mt-1 text-sm text-slate-600">{user.phone}</p>
              </div>
              <div className="rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700">
                {user.ordersCount}
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3">
                <p className="text-xs font-semibold text-slate-500">
                  {locale === "en" ? "Email" : "البريد الإلكتروني"}
                </p>
                <p className="mt-1 break-words text-sm text-slate-700">
                  {user.email || (locale === "en" ? "Not provided" : "غير متوفر")}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3">
                <p className="text-xs font-semibold text-slate-500">
                  {locale === "en" ? "Last order" : "آخر طلب"}
                </p>
                <p className="numeric-ltr mt-1 text-sm text-slate-700">
                  {formatDateTime(user.lastOrderAt, locale)}
                </p>
              </div>
            </div>

            <div className="mt-4">{renderActionButtons(user)}</div>
          </article>
        ))}
      </div>

      <div className="mt-6 hidden overflow-x-auto md:block">
        <table className={`min-w-full ${isRTL ? "text-right" : "text-left"}`}>
          <thead className="bg-slate-50/80">
            <tr className="text-sm text-slate-500">
              <th className="px-5 py-4 font-semibold">
                {locale === "en" ? "Name" : "الاسم"}
              </th>
              <th className="px-5 py-4 font-semibold">
                {locale === "en" ? "Phone" : "رقم الهاتف"}
              </th>
              <th className="px-5 py-4 font-semibold">
                {locale === "en" ? "Email" : "البريد الإلكتروني"}
              </th>
              <th className="px-5 py-4 font-semibold">
                {locale === "en" ? "Orders count" : "عدد الطلبات"}
              </th>
              <th className="px-5 py-4 font-semibold">
                {locale === "en" ? "Last order" : "آخر طلب"}
              </th>
              <th className="px-5 py-4 font-semibold">
                {locale === "en" ? "Actions" : "الإجراءات"}
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-t border-slate-100 text-sm">
                <td className="px-5 py-4 font-bold text-slate-900">
                  {user.fullName}
                </td>
                <td className="numeric-ltr px-5 py-4 text-slate-600">
                  {user.phone}
                </td>
                <td className="px-5 py-4 text-slate-600">
                  {user.email || (locale === "en" ? "Not provided" : "غير متوفر")}
                </td>
                <td className="numeric-ltr px-5 py-4 font-semibold text-slate-900">
                  {user.ordersCount}
                </td>
                <td className="numeric-ltr px-5 py-4 text-slate-600">
                  {formatDateTime(user.lastOrderAt, locale)}
                </td>
                <td className="px-5 py-4">{renderActionButtons(user)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
