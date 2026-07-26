import Link from "next/link";
import { CodeBlock } from "@/features/docs/components/code-block";
import { TableOfContents } from "@/features/docs/components/table-of-contents";
import { Alert } from "@/components/ui/alert";
import type { TocHeading } from "@/features/docs/types";

const HEADINGS: TocHeading[] = [
  { id: "api-keys", text: "API keys", depth: 2 },
  { id: "user-sessions", text: "User sessions (login)", depth: 2 },
  { id: "oauth2", text: "OAuth2", depth: 2 },
  { id: "automatic-token-refresh", text: "Automatic token refresh", depth: 2 },
  { id: "rotating-keys", text: "Rotating keys", depth: 2 },
];

const API_KEY_CODE = `import { KvlClient } from "@kvl/sdk";

const client = new KvlClient({
  auth: { type: "apiKey", apiKey: "sk_live_...redacted" },
});
`;

const BEARER_CODE = `import { KvlClient } from "@kvl/sdk";

// Start signed out, then log in:
const client = new KvlClient({ auth: { type: "none" } });
const { user } = await client.login("owner@example.com", "correct-password");

// Or construct already-signed-in with tokens you obtained elsewhere:
const client2 = new KvlClient({
  auth: { type: "bearer", accessToken: "...", refreshToken: "..." },
});
`;

const OAUTH_CODE = `import { KvlClient } from "@kvl/sdk";

const client = new KvlClient({ auth: { type: "none" } });

// After your app's own redirect-based authorization-code+PKCE flow:
const tokens = await client.oauth.exchangeCode({
  code,
  clientId,
  redirectUri,
  codeVerifier,
});
client.auth.setSession({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
`;

export default function AuthenticationPage() {
  return (
    <div className="flex gap-12">
      <article className="flex max-w-3xl min-w-0 flex-1 flex-col gap-10">
        <div className="flex flex-col gap-3">
          <h1 className="text-foreground text-3xl font-bold tracking-tight">Authentication</h1>
          <p className="text-muted-foreground text-lg">
            Every real auth method this API actually supports — API keys, a real user session
            (login/logout, auto-refreshed), and OAuth2 authorization-code + PKCE.
          </p>
        </div>

        <section className="flex flex-col gap-4">
          <h2 id="api-keys" className="text-foreground scroll-mt-24 text-2xl font-semibold">
            API keys
          </h2>
          <p className="text-foreground/90 leading-relaxed">
            For server-to-server and service-account use. Real, prefix-encoded, environment- and
            type-aware keys (see{" "}
            <Link
              href="/settings/api"
              className="text-accent font-medium underline underline-offset-4"
            >
              Settings → API
            </Link>{" "}
            to create one):
          </p>
          <ul className="text-foreground/90 flex list-disc flex-col gap-2 pl-5 leading-relaxed">
            <li>
              <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-[13px]">
                sk_live_...
              </code>{" "}
              /{" "}
              <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-[13px]">
                sk_test_...
              </code>{" "}
              — secret keys, full scopes, server-side only.
            </li>
            <li>
              <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-[13px]">
                pk_live_...
              </code>{" "}
              /{" "}
              <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-[13px]">
                pk_test_...
              </code>{" "}
              — publishable keys, real server-enforced rejection of any write scope, safe for
              client-side code.
            </li>
          </ul>
          <CodeBlock code={API_KEY_CODE} language="typescript" filename="api-key-client.ts" />
          <Alert variant="warning" title="Never expose a secret key in client-side code">
            <p>
              A{" "}
              <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-[13px]">sk_live_</code>{" "}
              key embedded in a browser bundle is visible to anyone who opens dev tools. Use a{" "}
              <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-[13px]">pk_live_</code>{" "}
              key for client-side code (the server rejects write scopes on it at creation time), or
              proxy requests through your own backend.
            </p>
          </Alert>
        </section>

        <section className="flex flex-col gap-4">
          <h2 id="user-sessions" className="text-foreground scroll-mt-24 text-2xl font-semibold">
            User sessions (login)
          </h2>
          <p className="text-foreground/90 leading-relaxed">
            A real Bearer session — the same real{" "}
            <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-[13px]">
              POST /auth/login
            </code>{" "}
            this app&apos;s own frontend uses. Tokens are stored via a real, pluggable{" "}
            <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-[13px]">TokenStore</code>{" "}
            —
            <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-[13px]">
              localStorage
            </code>{" "}
            in a browser, in-memory in Node unless you supply your own.
          </p>
          <CodeBlock code={BEARER_CODE} language="typescript" filename="login.ts" />
        </section>

        <section className="flex flex-col gap-4">
          <h2 id="oauth2" className="text-foreground scroll-mt-24 text-2xl font-semibold">
            OAuth2
          </h2>
          <p className="text-foreground/90 leading-relaxed">
            This app is also a real OAuth2 provider (authorization-code + PKCE).{" "}
            <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-[13px]">
              client.oauth
            </code>{" "}
            handles registering client apps and exchanging a real authorization code for tokens —
            once issued, an OAuth2 access token is just a Bearer token, so feed it into the same
            session machinery:
          </p>
          <CodeBlock code={OAUTH_CODE} language="typescript" filename="oauth.ts" />
        </section>

        <section className="flex flex-col gap-4">
          <h2
            id="automatic-token-refresh"
            className="text-foreground scroll-mt-24 text-2xl font-semibold"
          >
            Automatic token refresh
          </h2>
          <p className="text-foreground/90 leading-relaxed">
            Every request that gets a real 401 in Bearer mode triggers exactly one real{" "}
            <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-[13px]">
              POST /auth/refresh
            </code>{" "}
            call (deduped — concurrent 401s across several in-flight requests share one refresh),
            then transparently retries the original request with the new access token. If refresh
            also fails, the local session is cleared and{" "}
            <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-[13px]">
              auth.session_cleared
            </code>{" "}
            fires — a good place to redirect to a login screen.
          </p>
        </section>

        <section className="flex flex-col gap-4">
          <h2 id="rotating-keys" className="text-foreground scroll-mt-24 text-2xl font-semibold">
            Rotating keys
          </h2>
          <p className="text-foreground/90 leading-relaxed">
            <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-[13px]">
              client.apiKeys.rotate(id)
            </code>{" "}
            issues a real new secret and starts a real grace-period countdown on the old one
            (default 24h) — both authenticate successfully until it passes, so you can roll the new
            key out to your deployments before the old one stops working. See{" "}
            <Link
              href="/docs/api-explorer"
              className="text-accent font-medium underline underline-offset-4"
            >
              API Explorer
            </Link>{" "}
            for the full real endpoint.
          </p>
        </section>
      </article>

      <aside className="hidden w-56 shrink-0 xl:block">
        <div className="sticky top-24">
          <TableOfContents headings={HEADINGS} />
        </div>
      </aside>
    </div>
  );
}
