"use client";

import {
  Edit3,
  KeyRound,
  Save,
  ShieldCheck,
  Trash2,
  UserCircle2,
  X
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import StatusBadge from "@/components/shared/status-badge";
import { useI18n } from "@/hooks/use-i18n";
import { cn } from "@/lib/utils";

function buildInitialDrafts(drivers) {
  return drivers.reduce((accumulator, driver) => {
    accumulator[driver.id] = {
      name: driver.name || "",
      phone: driver.phone || "",
      status: driver.status || "offline",
      currentLocation: driver.currentLocation || ""
    };
    return accumulator;
  }, {});
}

function buildPayload(draft = {}) {
  return {
    name: (draft.name || "").trim(),
    phone: (draft.phone || "").trim(),
    status: draft.status || "offline",
    currentLocation: (draft.currentLocation || "").trim()
  };
}

function DriverMetric({ label, value, tone = "slate" }) {
  const toneMap = {
    slate: "text-slate-900",
    emerald: "text-emerald-700",
    brand: "text-brand-700"
  };

  return (
    <div className="rounded-2xl bg-white px-4 py-3 text-center">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className={cn("mt-2 text-xl font-extrabold", toneMap[tone] || toneMap.slate)}>
        {value}
      </p>
    </div>
  );
}

function LocationCell({ driver, draft, locale, isEditing, onChange }) {
  return (
    <div className="min-w-[230px] space-y-2">
      {isEditing ? (
        <input
          className="input-premium"
          value={draft.currentLocation || ""}
          onChange={onChange}
          placeholder={locale === "en" ? "Current location" : "الموقع الحالي"}
        />
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <p className="text-xs font-semibold text-slate-400">
            {locale === "en" ? "Current location" : "الموقع الحالي"}
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-900">
            {draft.currentLocation ||
              (locale === "en" ? "Not shared yet" : "لم يشارك الموقع بعد")}
          </p>
        </div>
      )}

      <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
        {driver.currentOrderId ? (
          <>
            {locale === "en" ? "Active order" : "الطلب النشط"}{" "}
            <span className="font-bold numeric-ltr">#{driver.currentOrderId}</span>
          </>
        ) : (
          <span>{locale === "en" ? "No active order" : "لا يوجد طلب نشط"}</span>
        )}
      </div>
    </div>
  );
}

function ActionButtons({
  driver,
  isBusy,
  isEditing,
  locale,
  onEdit,
  onCancel,
  onSave,
  onResetPassword,
  onDelete
}) {
  return (
    <div className="flex min-w-[250px] flex-col gap-2">
      <div className="grid grid-cols-2 gap-2">
        {isEditing ? (
          <>
            <button
              type="button"
              disabled={isBusy}
              onClick={onSave}
              className="button-primary h-11 w-full justify-center"
            >
              <Save className="h-4 w-4" />
              {isBusy
                ? locale === "en"
                  ? "Saving..."
                  : "جارٍ الحفظ..."
                : locale === "en"
                  ? "Save"
                  : "حفظ"}
            </button>
            <button
              type="button"
              disabled={isBusy}
              onClick={onCancel}
              className="button-secondary h-11 w-full justify-center"
            >
              <X className="h-4 w-4" />
              {locale === "en" ? "Cancel" : "إلغاء"}
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              disabled={isBusy}
              onClick={onEdit}
              className="button-primary h-11 w-full justify-center"
            >
              <Edit3 className="h-4 w-4" />
              {locale === "en" ? "Edit" : "تعديل"}
            </button>
            <button
              type="button"
              disabled={isBusy || !onDelete}
              onClick={() => onDelete(driver)}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-700 transition hover:-translate-y-0.5 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Trash2 className="h-4 w-4" />
              {locale === "en" ? "Delete" : "حذف"}
            </button>
          </>
        )}
      </div>

      <button
        type="button"
        disabled={isBusy || !onResetPassword}
        onClick={() => onResetPassword(driver)}
        className="button-secondary h-11 w-full justify-center"
      >
        <KeyRound className="h-4 w-4" />
        {locale === "en" ? "Reset Password" : "إعادة تعيين كلمة المرور"}
      </button>
    </div>
  );
}

export default function DriversTable({
  drivers,
  onUpdate,
  onResetPassword,
  onDeleteDriver,
  mutationIds
}) {
  const { locale, isRTL } = useI18n();
  const [drafts, setDrafts] = useState(() => buildInitialDrafts(drivers));
  const [editingId, setEditingId] = useState(null);
  const [latestReset, setLatestReset] = useState(null);

  useEffect(() => {
    setDrafts(buildInitialDrafts(drivers));
  }, [drivers]);

  const onlineCount = useMemo(
    () => drivers.filter((driver) => driver.status === "online").length,
    [drivers]
  );
  const availableCount = useMemo(
    () => drivers.filter((driver) => driver.availability === "available").length,
    [drivers]
  );
  const busyCount = useMemo(
    () => drivers.filter((driver) => driver.availability === "busy").length,
    [drivers]
  );

  function setDraftField(driverId, key, value) {
    setDrafts((current) => ({
      ...current,
      [driverId]: {
        ...current[driverId],
        [key]: value
      }
    }));
  }

  async function handleSave(driverId) {
    await onUpdate(driverId, buildPayload(drafts[driverId]));
    setEditingId(null);
  }

  async function handleResetPassword(driver) {
    if (!onResetPassword) {
      return;
    }

    try {
      const result = await onResetPassword(driver.id);
      const credentials = result?.credentials;

      if (!credentials) {
        return;
      }

      setLatestReset({
        driverId: driver.id,
        driverName: driver.name || (locale === "en" ? "Driver" : "سائق"),
        username: credentials.username || driver.username || "",
        temporaryPassword: credentials.temporaryPassword || ""
      });
    } catch {
      // Toast handled by provider.
    }
  }

  async function handleDelete(driver) {
    if (!onDeleteDriver) {
      return;
    }

    const confirmMessage =
      locale === "en"
        ? `Delete ${driver.name || "this driver"}? Active orders will remain but the driver account will be removed.`
        : `هل تريد حذف ${driver.name || "هذا السائق"}؟ ستبقى الطلبات الموجودة لكن سيتم حذف حساب السائق.`;

    if (typeof window !== "undefined" && !window.confirm(confirmMessage)) {
      return;
    }

    await onDeleteDriver(driver.id);
  }

  function resetDraft(driver) {
    setDrafts((current) => ({
      ...current,
      [driver.id]: buildInitialDrafts([driver])[driver.id]
    }));
    setEditingId(null);
  }

  return (
    <section className="panel-surface overflow-hidden p-5 lg:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="eyebrow-label">
            {locale === "en" ? "Driver accounts" : "حسابات السائقين"}
          </p>
          <h2 className="mt-2 text-2xl font-extrabold text-slate-950">
            {locale === "en" ? "Fleet Accounts Center" : "مركز حسابات الأسطول"}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-500">
            {locale === "en"
              ? "A cleaner operations table with structured account data, read-only availability from the driver app, and better arranged actions."
              : "جدول تشغيل أوضح بترتيب بيانات منظم، مع قسم توفر للعرض فقط من تطبيق السائق، وأزرار مرتبة بشكل أفضل."}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 rounded-[24px] border border-slate-200 bg-slate-50 p-2">
          <DriverMetric
            label={locale === "en" ? "Total" : "الإجمالي"}
            value={drivers.length}
          />
          <DriverMetric
            label={locale === "en" ? "Available" : "متاح"}
            value={availableCount}
            tone="emerald"
          />
          <DriverMetric
            label={locale === "en" ? "Busy" : "مشغول"}
            value={busyCount}
            tone="brand"
          />
        </div>
      </div>

      {latestReset ? (
        <div className="mt-6 rounded-[24px] border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-brand-50 p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
                {locale === "en"
                  ? "Password reset completed"
                  : "تمت إعادة تعيين كلمة المرور"}
              </p>
              <h3 className="mt-2 text-base font-extrabold text-slate-900">
                {locale === "en"
                  ? `New credentials for ${latestReset.driverName} (ID #${latestReset.driverId}).`
                  : `بيانات الدخول الجديدة للسائق ${latestReset.driverName} (رقم #${latestReset.driverId}).`}
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                {locale === "en"
                  ? "Share these credentials with the driver. The temporary password appears once after reset."
                  : "سلّم هذه البيانات إلى السائق. كلمة المرور المؤقتة تظهر مرة واحدة فقط بعد إعادة التعيين."}
              </p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-white/90 px-3 py-2 text-xs font-semibold text-amber-700">
              <ShieldCheck className="h-4 w-4" />
              {locale === "en" ? "Backend-generated" : "مولدة من الخادم"}
            </span>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-3">
              <p className="text-xs font-semibold text-slate-500">
                {locale === "en" ? "Username" : "اسم المستخدم"}
              </p>
              <p className="mt-1 text-lg font-extrabold text-slate-900 numeric-ltr">
                {latestReset.username || "--"}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-3">
              <p className="text-xs font-semibold text-slate-500">
                {locale === "en" ? "Temporary password" : "كلمة المرور المؤقتة"}
              </p>
              <p className="mt-1 text-lg font-extrabold text-slate-900 numeric-ltr">
                {latestReset.temporaryPassword || "--"}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mt-6 hidden overflow-x-auto xl:block">
        <table className={`min-w-[1380px] w-full ${isRTL ? "text-right" : "text-left"}`}>
          <thead>
            <tr className="bg-slate-50 text-sm text-slate-500">
              <th className="rounded-s-3xl px-4 py-4 font-semibold">
                {locale === "en" ? "Account" : "الحساب"}
              </th>
              <th className="px-4 py-4 font-semibold">
                {locale === "en" ? "Phone & Status" : "الهاتف والاتصال"}
              </th>
              <th className="px-4 py-4 font-semibold">
                {locale === "en" ? "Availability" : "التوفر"}
              </th>
              <th className="px-4 py-4 font-semibold">
                {locale === "en" ? "Location & Active Order" : "الموقع والطلب النشط"}
              </th>
              <th className="rounded-e-3xl px-4 py-4 font-semibold">
                {locale === "en" ? "Actions" : "الإجراءات"}
              </th>
            </tr>
          </thead>
          <tbody>
            {drivers.map((driver) => {
              const draft = drafts[driver.id] || {};
              const isEditing = editingId === driver.id;
              const isBusy = Boolean(mutationIds?.[driver.id]);

              return (
                <tr
                  key={driver.id}
                  className="border-t border-slate-100 align-top text-sm transition hover:bg-brand-50/10"
                >
                  <td className="px-4 py-4">
                    <div className="flex min-w-[280px] items-start gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                        <UserCircle2 className="h-6 w-6" />
                      </div>

                      <div className="min-w-0 flex-1 space-y-2">
                        {isEditing ? (
                          <input
                            className="input-premium"
                            value={draft.name || ""}
                            onChange={(event) =>
                              setDraftField(driver.id, "name", event.target.value)
                            }
                            placeholder={locale === "en" ? "Driver name" : "اسم السائق"}
                          />
                        ) : (
                          <div>
                            <h3 className="truncate text-base font-extrabold text-slate-950">
                              {driver.name || (locale === "en" ? "Driver" : "سائق")}
                            </h3>
                            <p className="mt-1 text-xs font-semibold text-slate-400">
                              #{driver.id}
                            </p>
                          </div>
                        )}

                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                          <p className="text-xs font-semibold text-slate-400">
                            {locale === "en" ? "Username" : "اسم المستخدم"}
                          </p>
                          <p className="mt-1 font-bold text-slate-900 numeric-ltr">
                            {driver.username || "--"}
                          </p>
                          <p className="mt-1 text-xs text-slate-500 break-all">
                            {driver.email || (locale === "en" ? "No email" : "بدون بريد")}
                          </p>
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    <div className="min-w-[250px] space-y-2">
                      {isEditing ? (
                        <input
                          className="input-premium numeric-ltr"
                          value={draft.phone || ""}
                          onChange={(event) =>
                            setDraftField(driver.id, "phone", event.target.value)
                          }
                          placeholder="+9689xxxxxxx"
                        />
                      ) : (
                        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                          <p className="text-xs font-semibold text-slate-400">
                            {locale === "en" ? "Phone number" : "رقم الهاتف"}
                          </p>
                          <p className="mt-2 text-sm font-bold text-slate-900 numeric-ltr">
                            {driver.phone || "--"}
                          </p>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <StatusBadge status={driver.status || "offline"} />
                        {isEditing ? (
                          <select
                            className="select-premium"
                            value={draft.status || "offline"}
                            onChange={(event) =>
                              setDraftField(driver.id, "status", event.target.value)
                            }
                          >
                            <option value="online">
                              {locale === "en" ? "Online" : "متصل"}
                            </option>
                            <option value="offline">
                              {locale === "en" ? "Offline" : "غير متصل"}
                            </option>
                          </select>
                        ) : null}
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    <div className="min-w-[210px] rounded-[24px] border border-slate-200 bg-white px-4 py-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                          {locale === "en" ? "Availability" : "التوفر"}
                        </p>
                        <StatusBadge status={driver.availability || "available"} />
                      </div>
                      <p className="mt-3 text-xs leading-6 text-slate-500">
                        {locale === "en"
                          ? "This value is synced from the driver workflow automatically."
                          : "هذه القيمة تتم مزامنتها تلقائيًا من حالة السائق الفعلية."}
                      </p>
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    <LocationCell
                      driver={driver}
                      draft={draft}
                      locale={locale}
                      isEditing={isEditing}
                      onChange={(event) =>
                        setDraftField(driver.id, "currentLocation", event.target.value)
                      }
                    />
                  </td>

                  <td className="px-4 py-4">
                    <ActionButtons
                      driver={driver}
                      isBusy={isBusy}
                      isEditing={isEditing}
                      locale={locale}
                      onEdit={() => setEditingId(driver.id)}
                      onCancel={() => resetDraft(driver)}
                      onSave={() => handleSave(driver.id)}
                      onResetPassword={handleResetPassword}
                      onDelete={handleDelete}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-6 grid gap-4 xl:hidden">
        {drivers.map((driver) => {
          const draft = drafts[driver.id] || {};
          const isEditing = editingId === driver.id;
          const isBusy = Boolean(mutationIds?.[driver.id]);

          return (
            <article
              key={`${driver.id}-mobile`}
              className="rounded-[28px] border border-slate-200 bg-gradient-to-b from-white to-slate-50/90 p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-lg font-extrabold text-slate-950">
                    {driver.name || (locale === "en" ? "Driver" : "سائق")}
                  </h3>
                  <p className="mt-1 text-xs font-semibold text-slate-400">
                    #{driver.id}
                  </p>
                </div>
                <StatusBadge status={driver.status || "offline"} />
              </div>

              <div className="mt-4 grid gap-3">
                {isEditing ? (
                  <>
                    <input
                      className="input-premium"
                      value={draft.name || ""}
                      onChange={(event) =>
                        setDraftField(driver.id, "name", event.target.value)
                      }
                    />
                    <input
                      className="input-premium numeric-ltr"
                      value={draft.phone || ""}
                      onChange={(event) =>
                        setDraftField(driver.id, "phone", event.target.value)
                      }
                    />
                    <select
                      className="select-premium"
                      value={draft.status || "offline"}
                      onChange={(event) =>
                        setDraftField(driver.id, "status", event.target.value)
                      }
                    >
                      <option value="online">
                        {locale === "en" ? "Online" : "متصل"}
                      </option>
                      <option value="offline">
                        {locale === "en" ? "Offline" : "غير متصل"}
                      </option>
                    </select>
                    <input
                      className="input-premium"
                      value={draft.currentLocation || ""}
                      onChange={(event) =>
                        setDraftField(driver.id, "currentLocation", event.target.value)
                      }
                    />
                  </>
                ) : (
                  <>
                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                      <p className="text-xs font-semibold text-slate-400">
                        {locale === "en" ? "Username" : "اسم المستخدم"}
                      </p>
                      <p className="mt-2 text-sm font-bold text-slate-900 numeric-ltr">
                        {driver.username || "--"}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                      <p className="text-xs font-semibold text-slate-400">
                        {locale === "en" ? "Phone number" : "رقم الهاتف"}
                      </p>
                      <p className="mt-2 text-sm font-bold text-slate-900 numeric-ltr">
                        {driver.phone || "--"}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                      <p className="text-xs font-semibold text-slate-400">
                        {locale === "en" ? "Availability" : "التوفر"}
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <StatusBadge status={driver.availability || "available"} />
                        <span className="text-xs text-slate-500">
                          {locale === "en" ? "Auto synced" : "تلقائي"}
                        </span>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                      <p className="text-xs font-semibold text-slate-400">
                        {locale === "en" ? "Current location" : "الموقع الحالي"}
                      </p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">
                        {driver.currentLocation ||
                          (locale === "en" ? "Not shared yet" : "لم يشارك الموقع بعد")}
                      </p>
                    </div>
                  </>
                )}

                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  {driver.currentOrderId ? (
                    <>
                      {locale === "en" ? "Active order" : "الطلب النشط"}{" "}
                      <span className="font-bold numeric-ltr">#{driver.currentOrderId}</span>
                    </>
                  ) : (
                    <span>{locale === "en" ? "No active order" : "لا يوجد طلب نشط"}</span>
                  )}
                </div>
              </div>

              <div className="mt-4">
                <ActionButtons
                  driver={driver}
                  isBusy={isBusy}
                  isEditing={isEditing}
                  locale={locale}
                  onEdit={() => setEditingId(driver.id)}
                  onCancel={() => resetDraft(driver)}
                  onSave={() => handleSave(driver.id)}
                  onResetPassword={handleResetPassword}
                  onDelete={handleDelete}
                />
              </div>
            </article>
          );
        })}
      </div>

      <div className="mt-6 rounded-[24px] border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-500">
        {locale === "en"
          ? `${onlineCount} drivers are online, and availability is now shown as an automatic driver-side signal.`
          : `يوجد ${onlineCount} سائقين متصلين، وقسم التوفر أصبح يُعرض كإشارة تلقائية من جهة السائق.`}
      </div>
    </section>
  );
}
