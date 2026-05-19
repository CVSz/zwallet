import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";

interface InlineErrorProps {
  title: string;
  detail?: string;
  onRetry?: () => void;
}

export function InlineError({ title, detail, onRetry }: InlineErrorProps) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-2xl border border-rose-300/25 bg-rose-500/10 p-4 text-rose-100">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <AlertTriangle className="h-4 w-4" />
        {title}
      </div>
      {detail ? <p className="text-sm text-rose-200/90">{detail}</p> : null}
      {onRetry ? (
        <Button type="button" variant="secondary" size="sm" onClick={onRetry}>
          Retry
        </Button>
      ) : null}
    </div>
  );
}
