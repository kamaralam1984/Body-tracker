"use client";

/**
 * Create-webhook flow, mirroring the one-time secret reveal pattern used by
 * `CreatePersonalApiKeyDialog` / admin's `CreateApiKeyDialog`: after
 * `createWebhook()` returns, the modal does NOT close — it swaps into a
 * "Your webhook secret" panel showing the full value, the one and only
 * moment this UI ever shows the complete secret. Every other surface only
 * ever renders `whsec_••••{secretLastFour}`.
 *
 * The mock factory only generates a `secretLastFour`, so the "full secret"
 * shown here is synthesized purely for the one-time display (`whsec_` + 32
 * masked-looking characters + `{secretLastFour}`); it is never stored and
 * never rendered again after this dialog closes.
 *
 * <CreateWebhookDialog />
 */

import { useState } from "react";
import { Check, Copy, ShieldAlert } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/components/ui/toast";
import { createWebhook, useSettingsStore, WEBHOOK_EVENT_TYPES } from "@/features/settings";
import type { Webhook } from "@/features/settings";

function synthesizeFullSecret(webhook: Webhook): string {
  return `whsec_${"x".repeat(32)}${webhook.secretLastFour}`;
}

function isValidUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed.startsWith("https://")) return false;
  return trimmed.length > "https://".length;
}

export function CreateWebhookDialog() {
  const createWebhookOpen = useSettingsStore((state) => state.createWebhookOpen);
  const setCreateWebhookOpen = useSettingsStore((state) => state.setCreateWebhookOpen);
  const addCreatedWebhook = useSettingsStore((state) => state.addCreatedWebhook);

  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [events, setEvents] = useState<Set<string>>(new Set());
  const [createdWebhook, setCreatedWebhook] = useState<Webhook | null>(null);
  const [copied, setCopied] = useState(false);

  function toggleEvent(event: string) {
    setEvents((prev) => {
      const next = new Set(prev);
      if (next.has(event)) next.delete(event);
      else next.add(event);
      return next;
    });
  }

  function reset() {
    setUrl("");
    setDescription("");
    setEvents(new Set());
    setCreatedWebhook(null);
    setCopied(false);
  }

  function resetAndClose() {
    reset();
    setCreateWebhookOpen(false);
  }

  function handleSubmit() {
    if (!isValidUrl(url) || events.size === 0) return;
    const record = createWebhook({
      url: url.trim(),
      description: description.trim(),
      events: Array.from(events),
    });
    addCreatedWebhook(record);
    setCreatedWebhook(record);
  }

  function handleDone() {
    resetAndClose();
    toast.success("Webhook created");
  }

  async function handleCopy() {
    if (!createdWebhook) return;
    await navigator.clipboard.writeText(synthesizeFullSecret(createdWebhook));
    setCopied(true);
    toast.success("Copied");
  }

  const urlValid = isValidUrl(url);
  const canSubmit = urlValid && events.size > 0;

  return (
    <Modal
      open={createWebhookOpen}
      onClose={resetAndClose}
      title={createdWebhook ? "Your webhook secret" : "Create webhook"}
      description={
        createdWebhook
          ? "Copy your signing secret now — you won't be able to see it again."
          : "Send real-time HTTP notifications to your own endpoint when events happen."
      }
      size="lg"
      footer={
        createdWebhook ? (
          <Button onClick={handleDone}>Done</Button>
        ) : (
          <>
            <Button variant="ghost" onClick={resetAndClose}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!canSubmit}>
              Create webhook
            </Button>
          </>
        )
      }
    >
      <div className="flex flex-col gap-4">
        {createdWebhook ? (
          <div className="flex flex-col gap-4">
            <div className="border-warning-600/30 bg-warning-bg flex items-start gap-3 rounded-lg border p-4">
              <ShieldAlert
                className="text-warning-600 dark:text-warning-500 mt-0.5 size-5 shrink-0"
                strokeWidth={1.75}
              />
              <p className="text-foreground text-sm">
                Use this secret to verify the signature of incoming webhook payloads. After you
                close this dialog, it will only ever appear masked as{" "}
                <code className="font-mono">whsec_••••{createdWebhook.secretLastFour}</code>.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-foreground text-sm font-medium">Signing secret</label>
              <div className="flex items-center gap-2">
                <code className="border-border bg-muted text-foreground flex-1 truncate rounded-md border px-3 py-2 font-mono text-sm">
                  {synthesizeFullSecret(createdWebhook)}
                </code>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleCopy}
                  aria-label="Copy secret"
                >
                  {copied ? <Check className="text-success-600 dark:text-success-500" /> : <Copy />}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="webhook-url" className="text-foreground text-sm font-medium">
                Endpoint URL
              </label>
              <Input
                id="webhook-url"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://example.com/webhooks/body-tracker"
                invalid={url.length > 0 && !urlValid}
                autoFocus
              />
              {url.length > 0 && !urlValid && (
                <p className="text-danger text-xs">Must be a valid https:// URL.</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="webhook-description" className="text-foreground text-sm font-medium">
                Description
              </label>
              <Textarea
                id="webhook-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="What is this webhook for?"
                rows={3}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-foreground text-sm font-medium">Events to send</label>
              <div className="border-border grid grid-cols-1 gap-2 rounded-lg border p-3 sm:grid-cols-2">
                {WEBHOOK_EVENT_TYPES.map((event) => (
                  <label
                    key={event}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 text-sm"
                  >
                    <Checkbox checked={events.has(event)} onChange={() => toggleEvent(event)} />
                    <span className="font-mono text-xs">{event}</span>
                  </label>
                ))}
              </div>
              {events.size === 0 && (
                <p className="text-muted-foreground text-xs">Select at least one event.</p>
              )}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
