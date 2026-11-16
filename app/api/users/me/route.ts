import { connection } from "next/server";
import { z } from "zod";
import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { AuthError, authError, authJson, publicUserSelect, requireUser } from "@/lib/auth";

const select = { ...publicUserSelect, sexe: true, updatedAt: true } as const;
const schema = z.strictObject({
  name: z.string().trim().min(2, "Le nom doit contenir au moins deux caractères.").max(200),
  email: z.string().trim().toLowerCase().email("Adresse e-mail invalide.").max(254),
  phone: z.string().trim().max(32).nullable().transform(value => value || null),
  sexe: z.enum(["HOMME", "FEMME"]).nullable(),
  updatedAt: z.iso.datetime(),
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

export async function PUT(request: Request) {
  try {
    const user = await requireUser(request);
    const { updatedAt, ...data } = schema.parse(await request.json());
    // Serialize the case-insensitive uniqueness check and the profile update.
    const profile = await prisma.$transaction(async tx => {
      const duplicate = await tx.user.findFirst({ where: { email: { equals: data.email, mode: "insensitive" }, id: { not: user.id } }, select: { id: true } });
      if (duplicate) throw new AuthError("Cette adresse e-mail est déjà utilisée.", 409);
      return tx.user.update({ where: { id: user.id, isActif: true, updatedAt: new Date(updatedAt) }, data, select });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return authJson(profile);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2025", "P2034"].includes(error.code)) {
      return authJson({ error: "Le profil a changé entre-temps. Rechargez-le avant de réessayer." }, 409);
    }
    return authError(error);
  }
}
