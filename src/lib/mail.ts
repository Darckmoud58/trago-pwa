/**
 * Envío de correo: Resend → SMTP fetch opcional → log (dev).
 * En desarrollo, si no hay proveedor, el cuerpo del mail se loguea y
 * las APIs pueden devolver `devPreview` con el enlace/código.
 */

export type MailPayload = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export function mailConfigured() {
  return Boolean(process.env.RESEND_API_KEY || process.env.SMTP_URL);
}

export async function sendMail(payload: MailPayload): Promise<{ ok: boolean; mode: "resend" | "log" }> {
  const from = process.env.MAIL_FROM || "TraGo <onboarding@resend.dev>";

  if (process.env.RESEND_API_KEY) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [payload.to],
        subject: payload.subject,
        text: payload.text,
        html: payload.html ?? `<pre>${payload.text}</pre>`,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Resend falló: ${res.status} ${body.slice(0, 200)}`);
    }
    return { ok: true, mode: "resend" };
  }

  console.info("[TraGo mail]", {
    to: payload.to,
    subject: payload.subject,
    text: payload.text,
  });
  return { ok: true, mode: "log" };
}

export function appBaseUrl() {
  return (process.env.APP_ORIGIN || "http://localhost:3000").replace(/\/$/, "");
}

export function allowDevMailPreview() {
  return (
    process.env.TRAGO_MAIL_DEV === "true" ||
    process.env.NODE_ENV !== "production" ||
    !mailConfigured()
  );
}
