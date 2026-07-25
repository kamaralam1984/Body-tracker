"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ErrorLayout } from "@/components/layout/error-layout";
import { Button } from "@/components/ui/button";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset?: () => void;
  unstable_retry?: () => void;
}

export default function GlobalError({ error, reset, unstable_retry }: GlobalErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const retry = unstable_retry ?? reset;

  return (
    <ErrorLayout
      code="500"
      title="Something went wrong"
      description="An unexpected error occurred. Our team has been notified — please try again."
      action={
        <div className="flex items-center gap-3">
          {retry && (
            <Button variant="primary" size="md" onClick={() => retry()}>
              Try again
            </Button>
          )}
          <Button variant="secondary" size="md" asChild>
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
        </div>
      }
    />
  );
}
