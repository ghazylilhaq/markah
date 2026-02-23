import { cn } from "@/lib/utils";

interface IntegrationCardProps {
  name: string;
  icon: React.ReactNode;
  description: string;
  connected: boolean;
  children: React.ReactNode;
}

export function IntegrationCard({
  name,
  icon,
  description,
  connected,
  children,
}: IntegrationCardProps) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-stone-200 bg-stone-50 text-stone-900">
            {icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-stone-900">{name}</h3>
              {connected && (
                <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                  Connected
                </span>
              )}
            </div>
            <p className={cn("mt-0.5 text-sm text-stone-500")}>{description}</p>
          </div>
        </div>
      </div>
      <div className="mt-4 border-t border-stone-100 pt-4">{children}</div>
    </div>
  );
}
