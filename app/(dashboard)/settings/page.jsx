"use client";

import SettingsForm from "@/components/settings/settings-form";
import { useI18n } from "@/hooks/use-i18n";

export default function SettingsPage() {
  const { locale } = useI18n();

  return (
    <div className="space-y-6">
      <section className="panel-surface p-6 lg:p-8">
        <span className="inline-flex rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
          {locale === "en" ? "Operational settings" : "إعدادات تشغيلية"}
        </span>
        <h1 className="mt-3 text-2xl font-extrabold text-slate-900 lg:text-3xl">
          {locale === "en"
            ? "Manage real system settings"
            : "إدارة إعدادات النظام الفعلية"}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-500">
          {locale === "en"
            ? "These controls are now wired to a backend settings endpoint, with local persistence only as a controlled fallback."
            : "هذه الإعدادات مرتبطة الآن بواجهة backend حقيقية، مع الحفظ المحلي فقط كخيار fallback منظم عند تعطل الخدمة."}
        </p>
      </section>

      <SettingsForm />
    </div>
  );
}
