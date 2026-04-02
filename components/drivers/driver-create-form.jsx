"use client";

import {
  CheckCircle2,
  KeyRound,
  Mail,
  MapPin,
  PlusCircle,
  ShieldCheck,
  Signal,
  UserPlus,
  UserSquare2,
  X
} from "lucide-react";
import { useMemo, useState } from "react";

import { useI18n } from "@/hooks/use-i18n";
import { cn } from "@/lib/utils";

const DEFAULT_PASSWORD = "12345678";
const MAX_USERNAME_LENGTH = 12;

const initialForm = {
  name: "",
  phone: "",
  email: "",
  vehicleLabel: "",
  licenseNumber: "",
  status: "offline",
  currentLocation: ""
};

function slugifyDriverName(name) {
  return String(name || "")
    .normalize("NFKD")
    .replace(/[^\x00-\x7F]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function buildUsernamePreview(name, phone) {
  const slug = slugifyDriverName(name);
  const phoneDigits = String(phone || "").replace(/\D/g, "");
  const phoneSuffix = phoneDigits.slice(-4);

  if (!slug && !phoneSuffix) {
    return "";
  }

  if (slug) {
    return `${slug}-${phoneSuffix || "0000"}`;
  }

  return `driver-${phoneSuffix || "0000"}`;
}

function InfoChip({ icon: Icon, label, value, tone = "slate", dir = "auto" }) {
  const tones = {
    slate: "border-slate-200 bg-slate-50 text-slate-700",
    brand: "border-brand-100 bg-brand-50 text-brand-700",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700"
  };

  return (
    <div
      className={cn(
        "rounded-2xl border px-4 py-3 shadow-[0_14px_30px_-24px_rgba(15,23,42,0.45)]",
        tones[tone] || tones.slate
      )}
    >
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em]">
        <Icon className="h-4 w-4" />
        <span>{label}</span>
      </div>
      <p className="mt-2 text-sm font-bold" dir={dir}>
        {value}
      </p>
    </div>
  );
}

export default function DriverCreateForm({
  onCreate,
  onUpdateDriver,
  creating,
  onClose
}) {
  const { locale, isRTL } = useI18n();
  const [form, setForm] = useState(initialForm);
  const [generatedCredentials, setGeneratedCredentials] = useState(null);
  const [usernameError, setUsernameError] = useState("");
  const [isSyncingPassword, setIsSyncingPassword] = useState(false);

  const usernamePreview = useMemo(
    () => buildUsernamePreview(form.name, form.phone),
    [form.name, form.phone]
  );
  const isUsernameTooLong =
    Boolean(usernamePreview) && usernamePreview.length > MAX_USERNAME_LENGTH;
  const isSubmitting = creating || isSyncingPassword;

  function updateField(key, value) {
    setForm((current) => ({
      ...current,
      [key]: value
    }));

    if (key === "name" || key === "phone") {
      setUsernameError("");
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (isUsernameTooLong) {
      setUsernameError(
        locale === "en"
          ? `Username preview must stay within ${MAX_USERNAME_LENGTH} characters.`
          : `يجب ألا يتجاوز اسم المستخدم المتوقع ${MAX_USERNAME_LENGTH} حرفًا.`
      );
      return;
    }

    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      vehicleLabel: form.vehicleLabel.trim(),
      licenseNumber: form.licenseNumber.trim(),
      status: form.status,
      currentLocation: form.currentLocation.trim()
    };

    try {
      const result = await onCreate(payload);

      let effectivePassword =
        result?.credentials?.temporaryPassword || DEFAULT_PASSWORD;
      let lockedToDefaultPassword = false;

      if (result?.driver?.id && onUpdateDriver) {
        setIsSyncingPassword(true);

        try {
          await onUpdateDriver(result.driver.id, {
            password: DEFAULT_PASSWORD
          });
          effectivePassword = DEFAULT_PASSWORD;
          lockedToDefaultPassword = true;
        } catch {
          lockedToDefaultPassword = false;
        } finally {
          setIsSyncingPassword(false);
        }
      }

      setGeneratedCredentials({
        driverName: payload.name,
        username: result?.credentials?.username || usernamePreview || "--",
        temporaryPassword: effectivePassword,
        usesDefaultPassword: lockedToDefaultPassword
      });
      setForm(initialForm);
      setUsernameError("");
    } catch {
      setIsSyncingPassword(false);
    }
  }

  return (
    <section className="panel-surface relative overflow-hidden p-6 lg:p-7">
      <div
        className={cn(
          "absolute inset-y-0 w-40",
          isRTL
            ? "right-0 bg-gradient-to-l from-brand-100/55 to-transparent"
            : "left-0 bg-gradient-to-r from-brand-100/55 to-transparent"
        )}
      />
      <div className="absolute -right-16 top-0 h-32 w-32 rounded-full bg-emerald-200/40 blur-3xl" />

      <div className="relative z-10 space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-brand-100 bg-brand-50 px-4 py-2 text-xs font-semibold text-brand-700">
              <UserPlus className="h-4 w-4" />
              {locale === "en" ? "Driver onboarding" : "تهيئة السائق"}
            </span>
            <div>
              <h2 className="text-2xl font-extrabold text-slate-950">
                {locale === "en" ? "Add Driver" : "إضافة سائق"}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-500">
                {locale === "en"
                  ? "Use a polished onboarding flow with a username preview, fixed default password, and instant account handoff after creation."
                  : "أنشئ السائق عبر نموذج أوضح وأذكى مع معاينة لاسم المستخدم وكلمة مرور افتراضية ثابتة وتسليم فوري لبيانات الحساب بعد الإنشاء."}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/85 px-4 py-3 text-xs font-semibold text-slate-600 shadow-[0_14px_30px_-24px_rgba(15,23,42,0.45)]">
              <ShieldCheck className="h-4 w-4 text-brand-600" />
              {locale === "en"
                ? "Connected to the existing driver API"
                : "مرتبط بمنطق السائق الحالي"}
            </div>

            {onClose ? (
              <button
                type="button"
                onClick={onClose}
                className="button-secondary h-11 px-4"
              >
                <X className="h-4 w-4" />
                {locale === "en" ? "Close" : "إغلاق"}
              </button>
            ) : null}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <InfoChip
            icon={UserSquare2}
            label={locale === "en" ? "Username preview" : "معاينة اسم المستخدم"}
            value={usernamePreview || (locale === "en" ? "Starts after typing name and phone" : "تظهر بعد إدخال الاسم والهاتف")}
            tone={isUsernameTooLong ? "slate" : "brand"}
            dir="ltr"
          />
          <InfoChip
            icon={KeyRound}
            label={locale === "en" ? "Default password" : "كلمة المرور الافتراضية"}
            value={DEFAULT_PASSWORD}
            tone="emerald"
            dir="ltr"
          />
          <InfoChip
            icon={Signal}
            label={locale === "en" ? "Validation rule" : "قاعدة التحقق"}
            value={
              locale === "en"
                ? `Preview must stay within ${MAX_USERNAME_LENGTH} characters`
                : `المعاينة يجب أن تبقى ضمن ${MAX_USERNAME_LENGTH} حرفًا`
            }
            tone="slate"
          />
        </div>

        {generatedCredentials ? (
          <div className="rounded-[28px] border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-brand-50 p-5 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                  {locale === "en" ? "Driver added successfully" : "تمت إضافة السائق بنجاح"}
                </p>
                <h3 className="mt-2 text-lg font-extrabold text-slate-900">
                  {locale === "en"
                    ? `Account ready for ${generatedCredentials.driverName}.`
                    : `حساب السائق ${generatedCredentials.driverName} أصبح جاهزًا.`}
                </h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  {generatedCredentials.usesDefaultPassword
                    ? locale === "en"
                      ? "The account password has been synchronized to the fixed default password 12345678 for a predictable handoff."
                      : "تمت مزامنة كلمة مرور الحساب إلى القيمة الثابتة 12345678 لتسليم واضح ومباشر."
                    : locale === "en"
                      ? "The backend returned a temporary password for this account."
                      : "أعاد الخادم كلمة مرور مؤقتة لهذا الحساب."}
                </p>
              </div>

              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/90 px-3 py-2 text-xs font-semibold text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
                {locale === "en" ? "Success message" : "رسالة نجاح"}
              </span>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold text-slate-500">
                  {locale === "en" ? "Username" : "اسم المستخدم"}
                </p>
                <p className="mt-2 break-all text-lg font-extrabold text-slate-950" dir="ltr">
                  {generatedCredentials.username}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold text-slate-500">
                  {locale === "en" ? "Password" : "كلمة المرور"}
                </p>
                <p
                  className="mt-2 break-all text-lg font-extrabold text-slate-950"
                  dir="ltr"
                >
                  {generatedCredentials.temporaryPassword}
                </p>
              </div>
            </div>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="grid gap-4 xl:grid-cols-8">
          <div className="xl:col-span-2">
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              {locale === "en" ? "Driver name" : "اسم السائق"}
            </label>
            <input
              required
              className="input-premium"
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
              placeholder={locale === "en" ? "Full name" : "الاسم الكامل"}
            />
          </div>

          <div className="xl:col-span-2">
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              {locale === "en" ? "Phone number" : "رقم الهاتف"}
            </label>
            <input
              required
              className="input-premium numeric-ltr"
              value={form.phone}
              onChange={(event) => updateField("phone", event.target.value)}
              placeholder="+9689xxxxxxx"
            />
          </div>

          <div className="xl:col-span-2">
            <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <UserSquare2 className="h-4 w-4 text-slate-500" />
              {locale === "en" ? "Generated username preview" : "معاينة اسم المستخدم المولد"}
            </label>
            <input
              readOnly
              value={usernamePreview}
              className={cn(
                "input-premium cursor-default bg-slate-50 font-semibold numeric-ltr",
                isUsernameTooLong &&
                  "border-rose-300 bg-rose-50 text-rose-700 focus:border-rose-300 focus:ring-rose-100"
              )}
              placeholder="driver-0000"
            />
            <div className="mt-2 flex items-center justify-between gap-3 text-xs">
              <span
                className={cn(
                  "font-semibold",
                  isUsernameTooLong ? "text-rose-600" : "text-slate-500"
                )}
              >
                {isUsernameTooLong
                  ? usernameError ||
                    (locale === "en"
                      ? `Shorten the name until the preview is ${MAX_USERNAME_LENGTH} characters or less.`
                      : `قصّر الاسم حتى تصبح المعاينة ${MAX_USERNAME_LENGTH} حرفًا أو أقل.`)
                  : locale === "en"
                    ? "Preview follows the current backend username pattern."
                    : "المعاينة تتبع نمط اسم المستخدم الحالي في الخادم."}
              </span>
              <span
                className={cn(
                  "rounded-full px-2 py-1 font-bold",
                  isUsernameTooLong
                    ? "bg-rose-100 text-rose-700"
                    : "bg-slate-100 text-slate-600"
                )}
              >
                {usernamePreview.length}/{MAX_USERNAME_LENGTH}
              </span>
            </div>
          </div>

          <div className="xl:col-span-2">
            <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <KeyRound className="h-4 w-4 text-slate-500" />
              {locale === "en" ? "Password" : "كلمة المرور"}
            </label>
            <input
              readOnly
              value={DEFAULT_PASSWORD}
              className="input-premium cursor-default bg-slate-50 font-semibold numeric-ltr"
            />
            <p className="mt-2 text-xs font-semibold text-slate-500">
              {locale === "en"
                ? "Locked in the form and synchronized after creation."
                : "مثبتة داخل النموذج ويتم ضبطها بعد إنشاء الحساب."}
            </p>
          </div>

          <div className="xl:col-span-2">
            <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Mail className="h-4 w-4 text-slate-500" />
              {locale === "en" ? "Email" : "البريد الإلكتروني"}
            </label>
            <input
              type="email"
              className="input-premium"
              value={form.email}
              onChange={(event) => updateField("email", event.target.value)}
              placeholder="driver@example.com"
            />
          </div>

          <div className="xl:col-span-2">
            <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Signal className="h-4 w-4 text-slate-500" />
              {locale === "en" ? "Connection" : "الحالة"}
            </label>
            <select
              className="select-premium"
              value={form.status}
              onChange={(event) => updateField("status", event.target.value)}
            >
              <option value="online">{locale === "en" ? "Active" : "نشط"}</option>
              <option value="offline">
                {locale === "en" ? "Offline" : "غير متصل"}
              </option>
            </select>
          </div>

          <div className="xl:col-span-2">
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              {locale === "en" ? "Availability source" : "مصدر التوفر"}
            </label>
            <div className="input-premium flex items-center bg-slate-50 text-sm font-semibold text-slate-500">
              {locale === "en"
                ? "Read automatically from driver activity"
                : "يُقرأ تلقائيًا من نشاط السائق"}
            </div>
          </div>

          <div className="xl:col-span-2">
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              {locale === "en" ? "Vehicle label" : "اسم المركبة"}
            </label>
            <input
              className="input-premium"
              value={form.vehicleLabel}
              onChange={(event) => updateField("vehicleLabel", event.target.value)}
              placeholder={locale === "en" ? "Van 01" : "شاحنة 01"}
            />
          </div>

          <div className="xl:col-span-2">
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              {locale === "en" ? "License number" : "رقم الرخصة"}
            </label>
            <input
              className="input-premium"
              value={form.licenseNumber}
              onChange={(event) => updateField("licenseNumber", event.target.value)}
              placeholder={locale === "en" ? "License / permit" : "الرخصة / التصريح"}
            />
          </div>

          <div className="xl:col-span-5">
            <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <MapPin className="h-4 w-4 text-slate-500" />
              {locale === "en" ? "Current location" : "الموقع الحالي"}
            </label>
            <input
              className="input-premium"
              value={form.currentLocation}
              onChange={(event) => updateField("currentLocation", event.target.value)}
              placeholder={locale === "en" ? "Muscat - Al Khuwair" : "مسقط - الخوير"}
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="button-primary h-12 w-full justify-center shadow-[0_24px_34px_-24px_rgba(249,115,22,0.65)]"
            >
              <PlusCircle className="h-4 w-4" />
              {isSubmitting
                ? locale === "en"
                  ? "Creating..."
                  : "جارٍ الإنشاء..."
                : locale === "en"
                  ? "Add Driver"
                  : "إضافة السائق"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
