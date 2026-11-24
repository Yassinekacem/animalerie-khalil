import { z } from "zod";
import { authError, authJson, limitAuthAttempt, readAuthBody } from "@/lib/auth";
import { EmailError, sendPasswordResetEmail } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const { email } = z.strictObject({ email: z.string().trim().toLowerCase().email().max(254) }).parse(await readAuthBody(request));
    limitAuthAttempt(`forgot-password:${email}`);
    try { await sendPasswordResetEmail(email); }
    catch (error) {
      if (!(error instanceof EmailError)) throw error;
      // Provider failures must not reveal whether this account exists.
      console.error("Password reset email delivery unavailable");
    }
    return authJson({ message: "Si cette adresse correspond à un compte actif, vous recevrez un lien de réinitialisation valable 30 minutes. Consultez aussi vos courriers indésirables. Si nécessaire, réessayez dans une minute." }, 202);
  } catch (error) { return authError(error); }
}
