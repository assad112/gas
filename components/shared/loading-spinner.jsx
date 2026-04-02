import { LoaderCircle } from "lucide-react";

export default function LoadingSpinner({ label = "جاري التحميل..." }) {
  return (
    <div className="panel-surface flex min-h-[320px] flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-50 text-brand-600">
        <LoaderCircle className="h-8 w-8 animate-spin" />
      </div>
      <div>
        <h3 className="text-lg font-bold text-slate-900">{label}</h3>
        <p className="mt-2 text-sm text-slate-500">
          يتم الآن تجهيز البيانات وعرضها بطريقة مباشرة.
        </p>
      </div>
    </div>
  );
}
