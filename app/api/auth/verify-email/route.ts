import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authError, authJson, limitAuthAttempt, readAuthBody } from "@/lib/auth";
import { verificationHash } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const { token } = z.strictObject({ token: z.string().regex(/^[0-9a-f]{64}$/) }).parse(await readAuthBody(request));
    const hash = verificationHash(token);
    limitAuthAttempt(`verify:${hash}`);
    const verified = await prisma.user.updateMany({
      where: { emailVerificationTokenHash: hash, emailVerificationExpiresAt: { gt: new Date() }, emailVerifiedAt: null, isActif: true },
      data: { emailVerifiedAt: new Date(), emailVerificationTokenHash: null, emailVerificationExpiresAt: null },
    });
    if (verified.count !== 1) return authJson({ error: "Ce lien est invalide, expiré ou déjà utilisé. Demandez un nouveau lien si votre email n’est pas encore vérifié." }, 400);
    return authJson({ message: "Votre adresse email est vérifiée. Vous pouvez maintenant vous connecter." });
  } catch (error) { return authError(error); }
}
