"use client";

import { RotateCcw, Save } from "lucide-react";
import { useEffect, useState } from "react";

import { useAdmin } from "@/hooks/use-admin";
import { useI18n } from "@/hooks/use-i18n";
import { fallbackSettings } from "@/services/api";

export default function SettingsForm() {
  const { locale, isRTL } = useI18n();
  const { settings, resources, saveSettings, savingSettings } = useAdmin();
  const [formValues, setFormValues] = useState(settings || fallbackSettings);

  useEffect(() => {
    setFormValues(settings || fallbackSettings);
  }, [settings]);

  function handleChange(event) {
    const { name, value, type, checked } = event.target;

    setFormValues((currentValues) => ({
      ...currentValues,
      [name]: type === "checkbox" ? checked : value
    }));
  }

  function handleReset() {
    setFormValues(settings || fallbackSettings);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    await saveSettings({
      ...formValues,
      defaultDeliveryFee: Number(formValues.defaultDeliveryFee || 0)
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-2">
        <div className="panel-surface p-5 sm:p-6">
          <h2 className="text-lg font-extrabold text-slate-900">
            {locale === "en" ? "Identity and language" : "الهوية واللغة"}
          </h2>
          <div className="mt-5 space-y-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                {locale === "en" ? "System name" : "اسم النظام"}
              </label>
              <input
                className="input-premium"
                name="systemName"
                value={formValues.systemName || ""}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                {locale === "en" ? "Default language" : "اللغة الافتراضية"}
              </label>
              <select
                className="select-premium"
                name="defaultLanguage"
                value={formValues.defaultLanguage || "ar"}
                onChange={handleChange}
              >
                <option value="ar">العربية</option>
                <option value="en">English</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                {locale === "en" ? "Currency" : "العملة"}
              </label>
              <input
                className="input-premium"
                name="currencyCode"
                value={formValues.currencyCode || "OMR"}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                {locale === "en" ? "System message" : "رسالة النظام"}
              </label>
              <textarea
                className="min-h-[120px] w-full rounded-[24px] border border-slate-200 bg-white/90 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-300 focus:ring-4 focus:ring-brand-100"
                name="systemMessage"
                value={formValues.systemMessage || ""}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        <div className="panel-surface p-5 sm:p-6">
          <h2 className="text-lg font-extrabold text-slate-900">
            {locale === "en" ? "Pricing and support" : "التسعير والدعم"}
          </h2>
          <div className="mt-5 space-y-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                {locale === "en" ? "Default delivery fee" : "رسوم التوصيل الافتراضية"}
              </label>
              <input
                type="number"
                step="0.001"
                className="input-premium numeric-ltr"
                name="defaultDeliveryFee"
                value={formValues.defaultDeliveryFee ?? 0}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                {locale === "en" ? "Support phone" : "هاتف الدعم"}
              </label>
              <input
                className="input-premium numeric-ltr"
                name="supportPhone"
                value={formValues.supportPhone || ""}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="panel-surface p-5 sm:p-6">
          <h2 className="text-lg font-extrabold text-slate-900">
            {locale === "en" ? "Operational toggles" : "خيارات التشغيل"}
          </h2>
          <div className="mt-5 space-y-4">
            {[
              {
                name: "maintenanceMode",
                title: locale === "en" ? "Maintenance mode" : "وضع الصيانة",
                description:
                  locale === "en"
                    ? "Temporarily pause operational updates and order intake."
                    : "إيقاف استقبال الطلبات مؤقتًا أثناء الصيانة."
              },
              {
                name: "notificationsEnabled",
                title: locale === "en" ? "Notifications" : "الإشعارات",
                description:
                  locale === "en"
                    ? "Enable operational notifications for admins."
                    : "تفعيل الإشعارات التشغيلية للأدمن."
              },
              {
                name: "autoAssignDrivers",
                title: locale === "en" ? "Auto-assign drivers" : "التعيين التلقائي للسائقين",
                description:
                  locale === "en"
                    ? "Use future driver automation once backend rules are ready."
                    : "استخدام التوزيع الآلي للسائقين عند اكتمال قواعده في الـ backend."
              },
              {
                name: "orderIntakeEnabled",
                title: locale === "en" ? "Accept new orders" : "استقبال طلبات جديدة",
                description:
                  locale === "en"
                    ? "Control whether the operation should continue receiving orders."
                    : "التحكم في استمرار استقبال الطلبات من عدمه."
              }
            ].map((item) => (
              <label
                key={item.name}
                className="flex flex-col gap-4 rounded-[24px] border border-slate-100 bg-slate-50/80 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <span>
                  <strong className="block text-sm text-slate-900">
                    {item.title}
                  </strong>
                  <span className="mt-1 block text-sm text-slate-500">
                    {item.description}
                  </span>
                </span>
                <input
                  type="checkbox"
                  name={item.name}
                  checked={Boolean(formValues[item.name])}
                  onChange={handleChange}
                  className="h-5 w-5 rounded border-slate-300 text-brand-500 focus:ring-brand-200"
                />
              </label>
            ))}
          </div>
        </div>

        <div className="panel-surface p-5 sm:p-6">
          <h2 className="text-lg font-extrabold text-slate-900">
            {locale === "en" ? "Persistence status" : "حالة الحفظ"}
          </h2>
          <div className="mt-5 rounded-[24px] border border-brand-100 bg-brand-50/60 p-5 text-sm leading-7 text-slate-600">
            {resources.settings.stale
              ? locale === "en"
                ? "The backend settings endpoint is currently unavailable, so the latest values are being kept in local persistence until the API responds again."
                : "واجهة إعدادات الـ backend غير متاحة حاليًا، لذلك يتم الاحتفاظ بآخر القيم عبر الحفظ المحلي إلى أن تعود الـ API للعمل."
              : locale === "en"
                ? "Settings are currently reading from and writing to the real backend endpoint."
                : "الإعدادات تُقرأ وتُحفظ حاليًا عبر الـ endpoint الحقيقي في الـ backend."}
          </div>
        </div>
      </section>

      <div
        className={`flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center ${
          isRTL ? "justify-end" : "justify-start"
        }`}
      >
        <button type="button" onClick={handleReset} className="button-secondary w-full sm:w-auto">
          <RotateCcw className="h-4 w-4" />
          {locale === "en" ? "Reset" : "إعادة تعيين"}
        </button>
        <button
          type="submit"
          disabled={savingSettings}
          className="button-primary w-full sm:w-auto"
        >
          <Save className="h-4 w-4" />
          {savingSettings
            ? locale === "en"
              ? "Saving..."
              : "جاري الحفظ..."
            : locale === "en"
              ? "Save settings"
              : "حفظ الإعدادات"}
        </button>
      </div>
    </form>
  );
}
