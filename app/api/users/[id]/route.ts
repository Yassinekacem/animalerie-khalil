import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { AuthError, authError, authJson, publicUserSelect, requireAdmin } from "@/lib/auth";
import { z } from "zod";

const select = { ...publicUserSelect, sexe: true, isActif: true, createdAt: true, updatedAt: true } as const;
const idSchema = z.string().regex(/^[1-9]\d*$/, "Identifiant invalide.").transform(Number).pipe(z.number().int().positive().max(2147483647));
const imageSchema = z.string().max(2800000, "L’image ne doit pas dépasser 2 Mo.").refine(value => {
  if (/^\/(?!\/)/.test(value)) return !/[\r\n]/.test(value);
  if (/^https?:\/\//i.test(value)) { try { return ["http:", "https:"].includes(new URL(value).protocol); } catch { return false; } }
  if (!/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value)) return false;
  const encoded = value.slice(value.indexOf(",") + 1);
  return Buffer.from(encoded, "base64").length <= 2 * 1024 * 1024;
}, "Utilisez une image PNG, JPEG ou WebP de 2 Mo maximum, une URL HTTP(S) ou un chemin local.");
const schema = z.strictObject({
  name: z.string().trim().min(2, "Le nom doit contenir au moins deux caractères.").max(200),
  email: z.string().trim().toLowerCase().email("Adresse e-mail invalide.").max(254),
  phone: z.string().trim().max(32).nullable().transform(value => value || null),
  sexe: z.enum(["HOMME", "FEMME"]).nullable(),
  image: imageSchema.nullable(),
  role: z.enum(["ADMIN", "CLIENT"]),
  isActif: z.boolean(),
  updatedAt: z.iso.datetime().optional(),
});
type Context = { params: Promise<{ id: string }> };

function handleError(error: unknown) {
  if (error instanceof AuthError) return authError(error);
  if (error instanceof z.ZodError) return authJson({ error: "Données invalides.", issues: error.issues }, 400);
  if (error instanceof SyntaxError) return authJson({ error: "Corps JSON incorrect." }, 400);
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") return authJson({ error: "Cette adresse e-mail est déjà utilisée." }, 409);
    if (error.code === "P2025") return authJson({ error: "Utilisateur introuvable ou modifié entre-temps. Rechargez ses détails." }, 409);
    if (error.code === "P2034") return authJson({ error: "Une modification concurrente a eu lieu. Rechargez les données et réessayez." }, 409);
  }
  console.error("User API error", error instanceof Error ? error.name : "UnknownError");
  return authJson({ error: "Impossible de traiter cet utilisateur." }, 500);
}

export async function GET(request: Request, context: Context) {
  try {
    await requireAdmin(request);
    const id = idSchema.parse((await context.params).id);
    const user = await prisma.user.findUnique({ where: { id }, select });
    if (!user) return authJson({ error: "Utilisateur introuvable." }, 404);
    return authJson(user);
  } catch (error) { return handleError(error); }
}

export async function PUT(request: Request, context: Context) {
  try {
    const admin = await requireAdmin(request);
    const id = idSchema.parse((await context.params).id);
    const { updatedAt, ...data } = schema.parse(await request.json());
    if (id === admin.id && (data.role !== "ADMIN" || !data.isActif)) {
      return authJson({ error: "Vous ne pouvez pas désactiver votre compte ni retirer votre propre rôle administrateur." }, 409);
    }
    // Keep authorization and the last-active-admin check consistent during concurrent edits.
    const user = await prisma.$transaction(async tx => {
      const actor = await tx.user.findUnique({ where: { id: admin.id }, select: { role: true, isActif: true } });
      if (!actor?.isActif || actor.role !== "ADMIN") throw new AuthError("Votre accès administrateur a changé. Reconnectez-vous.", 403);
      const current = await tx.user.findUnique({ where: { id }, select });
      if (!current) throw new AuthError("Utilisateur introuvable.", 404);
      if (updatedAt && current.updatedAt.toISOString() !== updatedAt) throw new AuthError("Cet utilisateur a été modifié entre-temps. Rechargez ses détails avant de réessayer.", 409);
      if (current.role === "ADMIN" && current.isActif && (data.role !== "ADMIN" || !data.isActif)) {
        const activeAdmins = await tx.user.count({ where: { role: "ADMIN", isActif: true } });
        if (activeAdmins <= 1) throw new AuthError("Le dernier administrateur actif doit être conservé.", 409);
      }
      const duplicate = await tx.user.findFirst({ where: { email: { equals: data.email, mode: "insensitive" }, id: { not: id } }, select: { id: true } });
      if (duplicate) throw new AuthError("Cette adresse e-mail est déjà utilisée.", 409);
      return tx.user.update({ where: { id }, data: { ...data, ...(data.email.toLowerCase() !== current.email.toLowerCase() ? {
        emailVerifiedAt: null, emailVerificationTokenHash: null, emailVerificationExpiresAt: null,
        passwordResetTokenHash: null, passwordResetExpiresAt: null,
      } : {}) }, select });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return authJson(user);
  } catch (error) { return handleError(error); }
}
