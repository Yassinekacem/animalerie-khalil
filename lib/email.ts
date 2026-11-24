import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export class EmailError extends Error {
  constructor(message: string, public status = 503, public deliveryUncertain = false,
    public providerStatus?: number, public providerCode?: string) { super(message); }
}

export function logEmailFailure(event: string, error: unknown) {
  const message = error instanceof Error ? error.message : "";
  const code = error && typeof error === "object" && "code" in error ? error.code : undefined;
  console.error(event, {
    errorType: error instanceof EmailError ? "EmailError" : error instanceof TypeError ? "TypeError" : /Prisma/.test(error instanceof Error ? error.name : "") ? "PrismaError" : "UnexpectedError",
    prismaCode: typeof code === "string" && /^P\d{4}$/.test(code) ? code : undefined,
    schemaMismatch: /Unknown (?:argument|field)|does not exist.*(?:column|table)|(?:column|table).*does not exist/i.test(message),
    runtimeImportUnavailable: /is not a function/.test(message),
    requestTimeout: error instanceof Error && ["AbortError", "TimeoutError"].includes(error.name),
    providerStatus: error instanceof EmailError ? error.providerStatus : undefined,
    providerCode: error instanceof EmailError ? error.providerCode : undefined,
    deliveryUncertain: error instanceof EmailError ? error.deliveryUncertain : undefined,
    // The full error/stack may contain Prisma arguments, customer data or URLs.
  });
}

export async function sendEmail({ to, subject, text, html, idempotencyKey }: { to: string; subject: string; text: string; html: string; idempotencyKey?: string }) {
  const apiKey = process.env.BREVO_API_KEY;
  const from = process.env.EMAIL_FROM?.trim() ?? "";
  const named = /^([^<>\r\n]+)\s*<([^<>\r\n]+)>$/.exec(from);
  const email = named ? named[2].trim() : from;
  if (!apiKey || !z.email().safeParse(email).success || /[\r\n]/.test(from)) {
    console.error("Transactional email configuration invalid", { apiKeyPresent: Boolean(apiKey), senderValid: z.email().safeParse(email).success && !/[\r\n]/.test(from) });
    throw new EmailError("Le service email est indisponible. Veuillez réessayer plus tard.");
  }
  if (!z.email().safeParse(to).success) throw new EmailError("Adresse email destinataire invalide.", 400);
  try {
    console.info("Transactional email request started");
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST", cache: "no-store", signal: AbortSignal.timeout(10_000),
      headers: { "api-key": apiKey, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ sender: { name: named ? named[1].trim() : "Animalerie Khalil", email }, to: [{ email: to }], subject, textContent: text, htmlContent: html,
        ...(idempotencyKey ? { headers: { idempotencyKey } } : {}) }),
    });
    const data = await response.json().catch(() => null);
    if (idempotencyKey && response.status === 400 && data?.code === "duplicate_parameter" &&
      typeof data.message === "string" && /idempotency key.*already.*processed/i.test(data.message)) {
      console.info("Transactional email already accepted", { providerStatus: response.status });
      return "idempotency-replayed";
    }
    if (!response.ok) {
      const providerCode = ["permission_denied", "unauthorized", "invalid_parameter", "missing_parameter", "duplicate_parameter", "not_enough_credits", "too_many_requests"].includes(data?.code) ? data.code as string : "unclassified";
      throw new EmailError("L’email n’a pas pu être envoyé. Réessayez dans une minute.", 503, response.status >= 500 || response.status === 408, response.status, providerCode);
    }
    if (typeof data?.messageId !== "string") throw new EmailError("L’envoi de l’email n’a pas pu être confirmé. Vérifiez votre boîte de réception avant de réessayer.", 503, true);
    console.info("Transactional email accepted", { providerStatus: response.status });
    return data.messageId as string;
  } catch (error) {
    logEmailFailure("Transactional email request failed", error);
    if (error instanceof EmailError) throw error;
    // Provider responses, API keys and verification URLs must never enter logs.
    throw new EmailError("Le service email ne répond pas. Vérifiez votre boîte de réception puis réessayez dans une minute.", 503, true);
  }
}

export async function notifyAdminOrder(orderId: number) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: { orderBy: { id: "asc" } } } });
  if (!order) return;
  const now = new Date();
  if (["SENT", "SKIPPED"].includes(order.adminNotificationStatus)) return;
  if (order.adminNotificationAttemptAt && now.getTime() - order.adminNotificationAttemptAt.getTime() < 60_000) return;
  // A crashed worker may have reached Brevo. Retry only inside a conservative
  // 10-minute window using the same UUID; beyond it require provider verification.
  const uncertain = ["UNKNOWN", "SENDING"].includes(order.adminNotificationStatus);
  if (uncertain && (!order.adminNotificationStartedAt || now.getTime() - order.adminNotificationStartedAt.getTime() >= 10 * 60_000)) {
    await prisma.order.updateMany({ where: { id: order.id, adminNotificationStatus: order.adminNotificationStatus,
      adminNotificationAttemptAt: order.adminNotificationAttemptAt }, data: { adminNotificationStatus: "UNKNOWN" } });
    return;
  }
  const claimed = await prisma.order.updateMany({ where: { id: order.id, adminNotificationStatus: order.adminNotificationStatus,
    adminNotificationAttemptAt: order.adminNotificationAttemptAt }, data: { adminNotificationStatus: "SENDING",
    adminNotificationAttemptAt: now, adminNotificationStartedAt: uncertain ? order.adminNotificationStartedAt : now } });
  if (claimed.count !== 1) return;
  const where = { id: order.id, adminNotificationStatus: "SENDING" as const, adminNotificationAttemptAt: now };
  const escape = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  const amount = (value: { toFixed: (digits: number) => string }) => `${value.toFixed(3).replace(".", ",")} TND`;
  const address = [order.deliveryAddress, order.ville, order.gouvernorat].filter(Boolean).join(", ");
  // Deterministic UUID scoped to this notification, independent of checkout retries.
  const digest = createHash("sha256").update(`admin-order:${order.reference}`).digest("hex");
  const idempotencyKey = `${digest.slice(0, 8)}-${digest.slice(8, 12)}-5${digest.slice(13, 16)}-a${digest.slice(17, 20)}-${digest.slice(20, 32)}`;
  const rows = order.items.map(item => `<tr><td style="padding:14px 0;border-bottom:1px solid #e5e7eb;overflow-wrap:anywhere">${escape(item.productName)}<br><span style="font-size:13px;color:#4b5563">${item.quantity} × ${amount(item.unitPrice)}</span></td><td style="padding:14px 0 14px 12px;border-bottom:1px solid #e5e7eb;text-align:right;white-space:nowrap">${amount(item.unitPrice.times(item.quantity))}</td></tr>`).join("");
  try {
    await sendEmail({ to: "khalil.animalerie@gmail.com", subject: `Nouvelle commande ${order.reference} — Animalerie Khalil`, idempotencyKey,
      text: `Nouvelle commande ${order.reference}\nClient : ${order.customerName}\nTéléphone : ${order.customerPhone}\nLivraison : ${address}\n\n${order.items.map(item => `${item.productName} — ${item.quantity} × ${amount(item.unitPrice)}`).join("\n")}\n\nSous-total : ${amount(order.subtotal)}\nLivraison : ${amount(order.deliveryFee)}\nTotal : ${amount(order.total)}`,
      html: `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0;background:#f7f8f6;color:#111;font-family:Arial,sans-serif"><table role="presentation" style="width:100%;border-spacing:0"><tr><td style="padding:24px 12px"><table role="presentation" style="width:100%;max-width:600px;margin:0 auto;border-spacing:0;background:white;border-radius:16px;overflow:hidden"><tr><td style="padding:28px 24px;background:#010101;color:white"><p style="margin:0 0 12px;color:#65d900;font-size:12px;font-weight:bold;letter-spacing:2px">ANIMALERIE KHALIL</p><h1 style="margin:0;font-size:26px">Nouvelle commande</h1><p style="margin:12px 0 0;overflow-wrap:anywhere;font-size:14px">${escape(order.reference)}</p></td></tr><tr><td style="padding:24px"><h2 style="margin:0 0 16px;font-size:18px">Client et livraison</h2><p style="line-height:1.7;overflow-wrap:anywhere"><strong>${escape(order.customerName)}</strong><br>Téléphone : ${escape(order.customerPhone)}<br>${escape(address)}</p><h2 style="margin:28px 0 8px;font-size:18px">Produits commandés</h2><table style="width:100%;border-collapse:collapse;font-size:14px"><thead><tr><th scope="col" style="text-align:left;padding:10px 0">Produit et quantité</th><th scope="col" style="text-align:right;padding:10px 0">Montant</th></tr></thead><tbody>${rows}</tbody></table><p style="font-size:14px;color:#4b5563;line-height:1.8">Sous-total : ${amount(order.subtotal)}<br>Livraison : ${amount(order.deliveryFee)}</p><p style="padding:18px;background:#65d900;border-radius:12px;font-size:20px;font-weight:bold">Total : ${amount(order.total)}</p><p style="margin:24px 0 0;font-size:13px;line-height:1.7;color:#4b5563">La commande a été enregistrée. Retrouvez-la dans la gestion des commandes de votre espace administrateur.</p></td></tr></table></td></tr></table></body></html>` });
  } catch (error) {
    // Preserve ambiguity across retries, even if a later attempt gets a definite error.
    const unknown = uncertain || !(error instanceof EmailError) || error.deliveryUncertain;
    await prisma.order.updateMany({ where, data: { adminNotificationStatus: unknown ? "UNKNOWN" : "FAILED" } });
    logEmailFailure("Order notification delivery unavailable", error);
    return;
  }
  // If persistence fails after provider acceptance, leave SENDING for a deduplicated retry.
  await prisma.order.updateMany({ where, data: { adminNotificationStatus: "SENT", adminNotificationSentAt: new Date() } });
}

function applicationUrl() {
  const configured = process.env.APP_URL ?? (process.env.NODE_ENV !== "production" ? "http://localhost:3000" : "");
  try {
    const url = new URL(configured);
    if (url.username || url.password || url.search || url.hash || url.pathname !== "/" ||
      (url.protocol !== "https:" && !(process.env.NODE_ENV !== "production" && url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname)))) throw new Error();
    return url;
  } catch { throw new EmailError("L’adresse du site pour les emails n’est pas configurée. Contactez la boutique."); }
}

export const verificationHash = (token: string) => createHash("sha256").update(token).digest("hex");

export async function sendPasswordResetEmail(email: string) {
  const users = await prisma.user.findMany({ where: { email: { equals: email, mode: "insensitive" } }, take: 2, select: {
    id: true, email: true, password: true, isActif: true, passwordResetSentAt: true,
    passwordResetWindowAt: true, passwordResetSendCount: true,
  } });
  // Ambiguous legacy addresses and inactive accounts must not receive reset links.
  const user = users.length === 1 ? users[0] : null;
  if (!user?.isActif) return;
  const now = new Date();
  const withinWindow = user.passwordResetWindowAt && now.getTime() - user.passwordResetWindowAt.getTime() < 3600_000;
  // Silently throttle to keep the response identical for existing and unknown accounts.
  if ((user.passwordResetSentAt && now.getTime() - user.passwordResetSentAt.getTime() < 60_000) ||
    (withinWindow && user.passwordResetSendCount >= 5)) return;
  const token = randomBytes(32).toString("hex");
  const tokenHash = verificationHash(token);
  const link = new URL("/mot-de-passe-oublie", applicationUrl());
  link.hash = `token=${token}`;
  const reserved = await prisma.user.updateMany({
    where: { id: user.id, email: user.email, password: user.password, isActif: true,
      passwordResetSentAt: user.passwordResetSentAt, passwordResetWindowAt: user.passwordResetWindowAt,
      passwordResetSendCount: user.passwordResetSendCount },
    data: { passwordResetTokenHash: tokenHash, passwordResetExpiresAt: new Date(now.getTime() + 30 * 60_000),
      passwordResetSentAt: now, passwordResetWindowAt: withinWindow ? user.passwordResetWindowAt : now,
      passwordResetSendCount: withinWindow ? user.passwordResetSendCount + 1 : 1 },
  });
  if (reserved.count !== 1) return;
  const url = link.toString();
  const escapedUrl = url.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  try {
    await sendEmail({ to: user.email, subject: "Réinitialisez votre mot de passe — Animalerie Khalil",
      text: `Pour choisir un nouveau mot de passe, ouvrez ce lien : ${url}\nCe lien est valable 30 minutes et utilisable une seule fois. Si vous n’êtes pas à l’origine de cette demande, ignorez cet email. Votre mot de passe reste inchangé.`,
      html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#111"><h1>Animalerie Khalil</h1><h2>Réinitialisez votre mot de passe</h2><p><a style="display:inline-block;background:#65D900;color:#111;padding:14px 20px;border-radius:12px;text-decoration:none;font-weight:bold" href="${escapedUrl}">Choisir un nouveau mot de passe</a></p><p>Ce lien est valable 30 minutes et utilisable une seule fois. Un nouvel envoi remplace le lien précédent.</p><p>Si vous n’êtes pas à l’origine de cette demande, ignorez cet email. Votre mot de passe reste inchangé.</p></div>` });
  } catch (error) {
    // Do not leave an undelivered token usable; never clear a more recent token.
    await prisma.user.updateMany({ where: { id: user.id, passwordResetTokenHash: tokenHash },
      data: { passwordResetTokenHash: null, passwordResetExpiresAt: null } });
    throw error;
  }
}

export async function sendVerificationEmail(userId: number) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: {
    email: true, emailVerifiedAt: true, isActif: true, emailVerificationSentAt: true,
    emailVerificationWindowAt: true, emailVerificationSendCount: true,
  } });
  if (!user || !user.isActif || user.emailVerifiedAt) return false;
  const now = new Date();
  const withinWindow = user.emailVerificationWindowAt && now.getTime() - user.emailVerificationWindowAt.getTime() < 3600_000;
  if (user.emailVerificationSentAt && now.getTime() - user.emailVerificationSentAt.getTime() < 60_000) throw new EmailError("Veuillez attendre une minute entre deux envois.", 429);
  if (withinWindow && user.emailVerificationSendCount >= 5) throw new EmailError("La limite de cinq envois par heure est atteinte. Réessayez plus tard.", 429);
  const link = new URL("/verifier-email", applicationUrl());
  const token = randomBytes(32).toString("hex");
  // The fragment is not sent in HTTP requests or Referer headers. The page removes it.
  link.hash = `token=${token}`;
  const reserved = await prisma.user.updateMany({
    where: { id: userId, email: user.email, isActif: true, emailVerifiedAt: null,
      emailVerificationSentAt: user.emailVerificationSentAt, emailVerificationWindowAt: user.emailVerificationWindowAt,
      emailVerificationSendCount: user.emailVerificationSendCount },
    data: { emailVerificationTokenHash: verificationHash(token), emailVerificationExpiresAt: new Date(now.getTime() + 24 * 3600_000),
      emailVerificationSentAt: now, emailVerificationWindowAt: withinWindow ? user.emailVerificationWindowAt : now,
      emailVerificationSendCount: withinWindow ? user.emailVerificationSendCount + 1 : 1 },
  });
  if (reserved.count !== 1) throw new EmailError("Un envoi vient déjà d’être demandé. Patientez avant de réessayer.", 429);
  const url = link.toString();
  const escapedUrl = url.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  await sendEmail({ to: user.email, subject: "Vérifiez votre email — Animalerie Khalil",
    text: `Bienvenue chez Animalerie Khalil. Confirmez votre adresse en ouvrant ce lien : ${url}\nCe lien est valable 24 heures et ne peut être utilisé qu’une fois. Si vous n’avez pas créé de compte, ignorez cet email.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#111"><h1>Animalerie Khalil</h1><h2>Confirmez votre adresse email</h2><p>Vérifiez votre adresse pour pouvoir vous connecter à votre compte.</p><p><a style="display:inline-block;background:#65D900;color:#111;padding:14px 20px;border-radius:12px;text-decoration:none;font-weight:bold" href="${escapedUrl}">Vérifier mon email</a></p><p>Ce lien est valable 24 heures et utilisable une seule fois. Un nouvel envoi remplace le lien précédent.</p><p>Si vous n’avez pas créé de compte, ignorez cet email.</p></div>` });
  return true;
}
