import Link from "next/link";
import { siteConfig } from "@/config/site";

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  description?: string;
}

export function AuthLayout({ children, title, description }: AuthLayoutProps) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="flex flex-col justify-between p-8 sm:p-12">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="bg-primary text-primary-foreground flex size-7 items-center justify-center rounded-md text-xs font-semibold">
            {siteConfig.shortName}
          </div>
          <span className="text-foreground text-sm font-semibold">{siteConfig.name}</span>
        </Link>

        <div className="mx-auto flex w-full max-w-sm flex-col gap-8 py-12">
          <div className="flex flex-col gap-2">
            <h1 className="text-foreground text-2xl font-semibold tracking-tight">{title}</h1>
            {description && <p className="text-muted-foreground text-sm">{description}</p>}
          </div>
          {children}
        </div>

        <p className="text-muted-foreground text-xs">
          © {new Date().getFullYear()} {siteConfig.name}. All rights reserved.
        </p>
      </div>

      <div className="relative hidden overflow-hidden bg-neutral-950 lg:block">
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center p-12">
          <div className="flex max-w-md flex-col gap-4 text-neutral-50">
            <p className="text-sm font-medium tracking-widest text-neutral-400 uppercase">
              {siteConfig.name}
            </p>
            <p className="text-3xl leading-tight font-medium tracking-tight">
              Precision performance analytics, built for teams who take the details seriously.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
