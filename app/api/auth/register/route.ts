import { hash } from "bcryptjs";
import { sendVerificationEmail } from "@/lib/email";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isValidLocation } from "@/lib/tunisia-locations";
import { authError, authJson, limitAuthAttempt, publicUserSelect, readAuthBody } from "@/lib/auth";

const schema = z.strictObject({
  name: z.string().trim().min(2, "Le nom doit contenir au moins deux caractères.").max(200),
  email: z.string().trim().toLowerCase().email("Adresse e-mail invalide.").max(254),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères.")
    .refine(value => Buffer.byteLength(value, "utf8") <= 72, "Le mot de passe ne doit pas dépasser 72 octets."),
  phone: z.string().trim().max(32).nullable().optional().transform(value => value || null),
  gouvernorat: z.string().trim().max(100).nullable().optional().transform(value => value || null),
  ville: z.string().trim().max(100).nullable().optional().transform(value => value || null),
  sexe: z.enum(["HOMME", "FEMME"], { error: "Veuillez sélectionner Homme ou Femme." }),
  image: z.string().trim().url("URL de photo invalide.").max(2048).refine(value => {
    try {
      const url = new URL(value);
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      return Boolean(cloudName) && url.protocol === "https:" && url.hostname === "res.cloudinary.com" && !url.port &&
        url.pathname.startsWith(`/${cloudName}/image/upload/`) && !url.username && !url.password;
    } catch { return false; }
  }, "La photo doit provenir du compte Cloudinary configuré.").nullable().optional(),
  acceptTerms: z.literal(true, { error: "Veuillez accepter les conditions d’utilisation." }),
}).refine(data => (!data.gouvernorat && !data.ville) ||
  Boolean(data.gouvernorat && data.ville && isValidLocation(data.gouvernorat, data.ville)), {
  path: ["ville"], message: "Sélectionnez un gouvernorat tunisien et une ville correspondante, ou laissez les deux champs vides.",
});

export async function POST(request: Request) {
  try {
    const data = schema.parse(await readAuthBody(request));
    limitAuthAttempt(`register:${data.email}`);
    // Also detects mixed-case addresses from records created before registration existed.
    const existing = await prisma.user.findFirst({ where: { email: { equals: data.email, mode: "insensitive" } }, select: { id: true } });
    if (existing) return authJson({ error: "Cette adresse e-mail est déjà utilisée." }, 409);
    const user = await prisma.user.create({
      data: { name: data.name, email: data.email, phone: data.phone, gouvernorat: data.gouvernorat, ville: data.ville, sexe: data.sexe, image: data.image ?? null, password: await hash(data.password, 12), role: "CLIENT", isActif: true },
      select: publicUserSelect,
    });
    // Account creation remains successful if the email provider is unavailable.
    // The customer can retry delivery without registering a second account.
    let emailSent = false;
    try { emailSent = await sendVerificationEmail(user.id); } catch { /* No provider details or secrets in logs. */ }
    return authJson({ user, emailSent }, 201);
  } catch (error) { return authError(error); }
}
