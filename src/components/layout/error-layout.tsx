import Link from "next/link";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";

interface ErrorLayoutProps {
  code: string;
  title: string;
  description: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export function ErrorLayout({ code, title, description, icon, action }: ErrorLayoutProps) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-8 p-6 text-center">
      <div className="flex flex-col items-center gap-6">
        {icon ?? (
          <p className="text-6xl font-semibold tracking-tight text-neutral-200 dark:text-neutral-800">
            {code}
          </p>
        )}
        <div className="flex flex-col gap-2">
          <h1 className="text-foreground text-xl font-semibold tracking-tight">{title}</h1>
          <p className="text-muted-foreground max-w-sm text-sm">{description}</p>
        </div>
      </div>
      {action ?? (
        <Button variant="secondary" asChild>
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      )}
      <p className="text-muted-foreground/70 text-xs">{siteConfig.name}</p>
    </div>
  );
}
