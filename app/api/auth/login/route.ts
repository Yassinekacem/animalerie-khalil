import { compare } from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authError, authJson, limitAuthAttempt, publicUserSelect, readAuthBody, startSession } from "@/lib/auth";

const schema = z.strictObject({
  email: z.string().trim().toLowerCase().email("Adresse e-mail invalide.").max(254),
  password: z.string().min(1, "Le mot de passe est obligatoire.")
    .refine(value => Buffer.byteLength(value, "utf8") <= 72, "Le mot de passe ne doit pas dépasser 72 octets."),
  rememberMe: z.boolean().default(false),
});
// Compare even for an unknown address to avoid a fast account-existence check.
const dummyHash = "$2b$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW";

export async function POST(request: Request) {
  try {
    const data = schema.parse(await readAuthBody(request));
    limitAuthAttempt(`login:${data.email}`);
    const users = await prisma.user.findMany({ where: { email: { equals: data.email, mode: "insensitive" } }, select: { ...publicUserSelect, password: true, isActif: true }, take: 2 });
    const user = users.length === 1 ? users[0] : null;
    const valid = await compare(data.password, user?.password ?? dummyHash);
    if (!user || !valid || !user.isActif) return authJson({ error: "Adresse e-mail ou mot de passe incorrect, ou compte désactivé." }, 401);
    await startSession(user, data.rememberMe);
    const { password: _password, isActif: _isActif, ...safeUser } = user;
    void _password; void _isActif;
    return authJson({ user: safeUser });
  } catch (error) { return authError(error); }
}
