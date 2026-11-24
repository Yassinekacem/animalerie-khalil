import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authError, authJson, limitAuthAttempt, readAuthBody } from "@/lib/auth";
import { EmailError, sendVerificationEmail } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const { email } = z.strictObject({ email: z.string().trim().toLowerCase().email().max(254) }).parse(await readAuthBody(request));
    limitAuthAttempt(`resend-verification:${email}`);
    const user = await prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } }, select: { id: true } });
    if (user) await sendVerificationEmail(user.id);
    return authJson({ message: "Si cette adresse correspond à un compte actif non vérifié, un lien a été envoyé. Consultez aussi vos courriers indésirables." }, 202);
  } catch (error) {
    if (error instanceof EmailError) return authJson({ error: error.message }, error.status);
    return authError(error);
  }
}
