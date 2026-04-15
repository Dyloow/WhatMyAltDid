"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Suspense } from "react";
import { useI18n } from "@/lib/i18n";

function AuthErrorContent() {
  const params = useSearchParams();
  const error = params.get("error");
  const { t } = useI18n();

  const messages: Record<string, string> = {
    Configuration: t("auth.error.config"),
    AccessDenied: t("auth.error.denied"),
    Verification: t("auth.error.token"),
    Default: t("auth.error.generic"),
  };

  const message = messages[error ?? ""] ?? messages.Default;

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="text-5xl">⚠️</div>
      <h1 className="text-2xl font-bold">{t("auth.error.title")}</h1>
      <p className="text-muted-foreground">{message}</p>
      <Link href="/">
        <Button>{t("auth.error.back")}</Button>
      </Link>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[80vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-transparent" />
        </div>
      }
    >
      <AuthErrorContent />
    </Suspense>
  );
}
