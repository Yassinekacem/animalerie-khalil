import { connection } from "next/server";
import { z } from "zod";
import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { AuthError, authError, authJson, publicUserSelect, requireUser } from "@/lib/auth";
import { isValidLocation } from "@/lib/tunisia-locations";

const select = { ...publicUserSelect, sexe: true, updatedAt: true } as const;
const schema = z.strictObject({
  name: z.string().trim().min(2, "Le nom doit contenir au moins deux caractères.").max(200).optional(),
  email: z.string().trim().toLowerCase().email("Adresse e-mail invalide.").max(254).optional(),
  phone: z.string().trim().max(32).nullable().transform(value => value || null).optional(),
  gouvernorat: z.string().trim().max(100).nullable().transform(value => value || null).optional(),
  ville: z.string().trim().max(100).nullable().transform(value => value || null).optional(),
  sexe: z.enum(["HOMME", "FEMME"]).nullable().optional(),
  image: z.string().trim().url("URL de photo invalide.").max(2048).refine(value => {
    try {
      const url = new URL(value);
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      return Boolean(cloudName) && url.protocol === "https:" && url.hostname === "res.cloudinary.com" && !url.port &&
        url.pathname.startsWith(`/${cloudName}/image/upload/`) && !url.username && !url.password;
    } catch { return false; }
  }, "La photo doit provenir du compte Cloudinary configuré.").nullable().optional(),
  updatedAt: z.iso.datetime(),
}).refine(fields => [fields.name, fields.email, fields.phone, fields.gouvernorat, fields.ville, fields.sexe, fields.image].some(value => value !== undefined), {
  message: "Indiquez au moins un champ à modifier.",
});

export async function GET(request: Request) {
  await connection();
  try {
    const user = await requireUser(request);
    const profile = await prisma.user.findUnique({ where: { id: user.id, isActif: true }, select });
    if (!profile) throw new AuthError("Veuillez vous reconnecter.", 401);
    return authJson(profile);
  } catch (error) { return authError(error); }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireUser(request);
    const { updatedAt, ...data } = schema.parse(await request.json());
    if (data.gouvernorat !== undefined || data.ville !== undefined) {
      const gouvernorat = data.gouvernorat !== undefined ? data.gouvernorat : user.gouvernorat;
      const ville = data.ville !== undefined ? data.ville : user.ville;
      if ((gouvernorat || ville) && (!gouvernorat || !ville || !isValidLocation(gouvernorat, ville))) {
        throw new AuthError("Sélectionnez un gouvernorat tunisien et une ville correspondante, ou effacez les deux champs.", 400);
      }
      // Écrire la paire validée, même lors d'une mise à jour partielle.
      data.gouvernorat = gouvernorat;
      data.ville = ville;
    }
    const where = { id: user.id, isActif: true, updatedAt: new Date(updatedAt) };
    // Serialize the email uniqueness check with the update only when needed.
    const profile = data.email !== undefined ? await prisma.$transaction(async tx => {
      const duplicate = await tx.user.findFirst({ where: { email: { equals: data.email, mode: "insensitive" }, id: { not: user.id } }, select: { id: true } });
      if (duplicate) throw new AuthError("Cette adresse e-mail est déjà utilisée.", 409);
      return tx.user.update({ where, data: { ...data, ...(data.email?.toLowerCase() !== user.email.toLowerCase() ? {
        emailVerifiedAt: null, emailVerificationTokenHash: null, emailVerificationExpiresAt: null,
        passwordResetTokenHash: null, passwordResetExpiresAt: null,
      } : {}) }, select });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }) : await prisma.user.update({ where, data, select });
    return authJson(profile);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2025", "P2034"].includes(error.code)) {
      return authJson({ error: "Le profil a changé entre-temps. Rechargez-le avant de réessayer." }, 409);
    }
    return authError(error);
  }
}
