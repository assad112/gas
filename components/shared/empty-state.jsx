import { Inbox } from "lucide-react";

export default function EmptyState({
  title,
  description,
  icon: Icon = Inbox
}) {
  return (
    <div className="panel-surface flex min-h-[320px] flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-500">
        <Icon className="h-8 w-8" />
      </div>
      <div>
        <h3 className="text-lg font-bold text-slate-900">{title}</h3>
        <p className="mt-2 max-w-md text-sm leading-7 text-slate-500">
          {description}
        </p>
      </div>
    </div>
  );
}
