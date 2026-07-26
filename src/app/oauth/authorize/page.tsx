"use client";

/**
 * Real OAuth2 consent screen — the redirect target a third-party app sends
 * the user's browser to (RFC 6749 authorization-code + RFC 7636 PKCE).
 * Not under `(app)`'s layout (no sidebar/nav — same reasoning as `/login`
 * living outside that group): a consent screen should look like exactly
 * what it is, not a page inside the product.
 */

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/features/auth";
import { apiFetchJson } from "@/features/auth/lib/api-client";

interface ClientInfo {
  clientName: string;
  requestedScopes: string[];
  grantableScopes: string[];
  ungrantableScopes: string[];
}

function AuthorizeContent() {
  const params = useSearchParams();
  const { user, status } = useAuth();
  const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deciding, setDeciding] = useState(false);

  const clientId = params.get("client_id") ?? "";
  const redirectUri = params.get("redirect_uri") ?? "";
  const scope = params.get("scope") ?? "";
  const state = params.get("state") ?? undefined;
  const codeChallenge = params.get("code_challenge") ?? "";
  const codeChallengeMethod = params.get("code_challenge_method") ?? "";

  const missingParams = !clientId || !redirectUri || !scope || !codeChallenge;

  useEffect(() => {
    if (missingParams) return;
    const query = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope,
      code_challenge: codeChallenge,
      code_challenge_method: codeChallengeMethod,
    });
    fetch(`/api/v1/oauth/authorize?${query.toString()}`)
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body?.error?.message ?? "Failed to load client");
        setClientInfo(body.data as ClientInfo);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load client"));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- params are read once from the URL, not expected to change on this page
  }, [missingParams]);

  async function decide(approve: boolean) {
    setDeciding(true);
    setError(null);
    try {
      const result = await apiFetchJson<{ redirectTo: string }>("/api/v1/oauth/authorize", {
        method: "POST",
        body: JSON.stringify({
          client_id: clientId,
          redirect_uri: redirectUri,
          scope,
          state,
          code_challenge: codeChallenge,
          code_challenge_method: codeChallengeMethod,
          approve,
        }),
      });
      window.location.href = result.redirectTo;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setDeciding(false);
    }
  }

  if (missingParams) {
    return (
      <ConsentShell>
        <p className="text-danger-600 dark:text-danger-500 text-sm">
          This link is missing required parameters (client_id, redirect_uri, scope, code_challenge)
          — it isn&apos;t a valid OAuth authorization request.
        </p>
      </ConsentShell>
    );
  }

  if (status === "loading") {
    return (
      <ConsentShell>
        <p className="text-muted-foreground text-sm">Loading…</p>
      </ConsentShell>
    );
  }

  if (status === "unauthenticated" || !user) {
    return (
      <ConsentShell>
        <p className="text-foreground text-sm">
          You need to sign in to Body Tracker before you can approve this request.
        </p>
        <Button asChild className="w-full">
          <Link href="/login">Sign in</Link>
        </Button>
        <p className="text-muted-foreground text-xs">
          After signing in, come back to this link to finish approving access.
        </p>
      </ConsentShell>
    );
  }

  if (error && !clientInfo) {
    return (
      <ConsentShell>
        <p className="text-danger-600 dark:text-danger-500 text-sm">{error}</p>
      </ConsentShell>
    );
  }

  if (!clientInfo) {
    return (
      <ConsentShell>
        <p className="text-muted-foreground text-sm">Loading…</p>
      </ConsentShell>
    );
  }

  return (
    <ConsentShell>
      <p className="text-foreground text-sm">
        <strong>{clientInfo.clientName}</strong> wants to access your Body Tracker account (
        {user.email}) with:
      </p>
      <ul className="flex flex-col gap-1.5">
        {clientInfo.grantableScopes.map((s) => (
          <li key={s} className="flex items-center gap-2 text-sm">
            <ShieldCheck className="text-success-600 dark:text-success-500 size-4 shrink-0" />
            <code className="font-mono text-xs">{s}</code>
          </li>
        ))}
      </ul>
      {clientInfo.ungrantableScopes.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="text-muted-foreground text-xs">
            This app isn&apos;t registered for the following requested scopes, so they won&apos;t be
            granted even if you approve:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {clientInfo.ungrantableScopes.map((s) => (
              <Badge key={s} variant="warning">
                {s}
              </Badge>
            ))}
          </div>
        </div>
      )}
      {error && <p className="text-danger-600 dark:text-danger-500 text-sm">{error}</p>}
      <div className="flex gap-3">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => decide(false)}
          disabled={deciding}
        >
          Deny
        </Button>
        <Button
          className="flex-1"
          onClick={() => decide(true)}
          disabled={deciding || clientInfo.grantableScopes.length === 0}
        >
          Approve
        </Button>
      </div>
    </ConsentShell>
  );
}

function ConsentShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardContent className="flex flex-col gap-4 p-6">
          <div className="flex items-center gap-2">
            <ShieldCheck className="text-accent-600 dark:text-accent-400 size-5" />
            <h1 className="text-foreground text-lg font-semibold">Authorize access</h1>
          </div>
          {children}
        </CardContent>
      </Card>
    </div>
  );
}

export default function OAuthAuthorizePage() {
  return (
    <Suspense fallback={<ConsentShell>Loading…</ConsentShell>}>
      <AuthorizeContent />
    </Suspense>
  );
}
