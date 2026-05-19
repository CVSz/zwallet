import type { BadgeProps } from "@/components/ui/badge";
import type { WalletTransfer } from "@/lib/api/types";

export function shortAddress(value: string): string {
  if (value.length <= 14) {
    return value;
  }

  return `${value.slice(0, 8)}...${value.slice(-6)}`;
}

export function shortHash(value: string | undefined): string {
  if (!value) {
    return "-";
  }

  return shortAddress(value);
}

export function transferBadgeVariant(status: WalletTransfer["status"]): BadgeProps["variant"] {
  if (status === "confirmed") {
    return "success";
  }

  if (status === "failed" || status === "cancelled") {
    return "danger";
  }

  if (status === "executing" || status === "broadcasted" || status === "signed") {
    return "info";
  }

  return "warning";
}

export function formatAtomic(value: string): string {
  if (!/^\d+$/.test(value)) {
    return value;
  }

  const digits = value.split("");
  let formatted = "";

  for (let i = 0; i < digits.length; i += 1) {
    const reverseIndex = digits.length - i;
    formatted += digits[i];

    if (reverseIndex > 1 && reverseIndex % 3 === 1) {
      formatted += ",";
    }
  }

  return formatted;
}

export function formatTimestamp(value: string): string {
  const time = Date.parse(value);
  if (!Number.isFinite(time)) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(time));
}
