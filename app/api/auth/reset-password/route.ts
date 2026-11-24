import { hash } from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authError, authJson, endSession, limitAuthAttempt, readAuthBody } from "@/lib/auth";
import { verificationHash } from "@/lib/email";

const schema = z.strictObject({
  token: z.string().regex(/^[0-9a-f]{64}$/),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères.").max(72)
    .refine(value => Buffer.byteLength(value, "utf8") <= 72, "Le mot de passe ne doit pas dépasser 72 octets."),
});

export async function POST(request: Request) {
  try {
    const { token, password } = schema.parse(await readAuthBody(request));
    const tokenHash = verificationHash(token);
    limitAuthAttempt(`reset-password:${tokenHash}`);
    const valid = await prisma.user.findUnique({ where: { passwordResetTokenHash: tokenHash }, select: { passwordResetExpiresAt: true, isActif: true } });
    const invalid = () => authJson({ error: "Ce lien est invalide, expiré ou déjà utilisé. Demandez un nouveau lien." }, 400);
    if (!valid?.isActif || !valid.passwordResetExpiresAt || valid.passwordResetExpiresAt <= new Date()) return invalid();
    const passwordHash = await hash(password, 12);
    // Atomic consumption: concurrent submissions can change the password only once.
    const updated = await prisma.user.updateMany({
      where: { passwordResetTokenHash: tokenHash, passwordResetExpiresAt: { gt: new Date() }, isActif: true },
      data: { password: passwordHash, passwordResetTokenHash: null, passwordResetExpiresAt: null },
    });
    if (updated.count !== 1) return invalid();
    // All other sessions fail the existing passwordVersion check in getCurrentUser.
    await endSession();
    return authJson({ message: "Votre mot de passe a été réinitialisé. Toutes vos sessions ont été déconnectées. Connectez-vous avec votre nouveau mot de passe." });
  } catch (error) { return authError(error); }
}
