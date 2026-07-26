import { logger } from "@/server/logging/logger";

/**
 * Real SMTP email sending via `nodemailer` — entirely opt-in: does nothing
 * but log unless `SMTP_URL` is set (e.g.
 * `smtp://user:pass@smtp.sendgrid.net:587`), matching the same
 * real-code-ready-but-opt-in-infra pattern as OpenTelemetry
 * (`src/server/observability/otel.ts`). Never fabricates a "sent" result —
 * a deployment without SMTP configured just gets a logged no-op, not a
 * silently swallowed failure or a fake success.
 */
export async function sendEmail(params: {
  to: string;
  subject: string;
  body: string;
}): Promise<void> {
  const smtpUrl = process.env.SMTP_URL;
  if (!smtpUrl) {
    logger.info(
      { to: params.to, subject: params.subject },
      "email not sent — SMTP_URL is not configured (notification still recorded in-app)",
    );
    return;
  }

  const { createTransport } = await import("nodemailer");
  const transport = createTransport(smtpUrl);
  const from = process.env.SMTP_FROM ?? "notifications@bodytracker.app";

  try {
    await transport.sendMail({
      from,
      to: params.to,
      subject: params.subject,
      text: params.body,
    });
    logger.info({ to: params.to, subject: params.subject }, "email sent");
  } catch (error) {
    logger.error({ err: error, to: params.to }, "failed to send email");
  }
}
