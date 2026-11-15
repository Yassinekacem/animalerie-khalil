import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { getIronSession } from "iron-session";
import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

type Session = { userId: number; passwordVersion: string; expiresAt: number };
export const publicUserSelect = { id: true, name: true, email: true, phone: true, image: true, role: true } as const;
const cookieName = "animalerie-khalil-session";

export class AuthError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

function sessionOptions(rememberMe = false) {
  const password = process.env.SESSION_PASSWORD;
  if (!password || password.length < 32) throw new AuthError("Authentification indisponible : SESSION_PASSWORD doit contenir au moins 32 caractères côté serveur.", 503);
  return {
    password, cookieName, ttl: rememberMe ? 30 * 86400 : 8 * 3600,
    cookieOptions: { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", ...(rememberMe ? {} : { maxAge: undefined }) },
  };
}

const passwordVersion = (password: string) => createHash("sha256").update(password).digest("hex");

export async function startSession(user: { id: number; password: string }, rememberMe: boolean) {
  const session = await getIronSession<Session>(await cookies(), sessionOptions(rememberMe));
  session.userId = user.id;
  session.passwordVersion = passwordVersion(user.password);
  session.expiresAt = Date.now() + (rememberMe ? 30 * 86400 : 8 * 3600) * 1000;
  await session.save();
}

export async function endSession() {
  // Logout also works if the server secret has been rotated or is missing.
  (await cookies()).set(cookieName, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
}

export async function getCurrentUser() {
  // Authentication must run for the incoming request, including with Cache Components.
  await connection();
  const session = await getIronSession<Session>(await cookies(), sessionOptions());
  if (!Number.isInteger(session.userId) || Number(session.userId) <= 0 || Number(session.userId) > 2147483647 ||
    typeof session.expiresAt !== "number" || session.expiresAt <= Date.now() ||
    typeof session.passwordVersion !== "string" || !/^[a-f0-9]{64}$/.test(session.passwordVersion)) return null;
  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { ...publicUserSelect, password: true, isActif: true } });
  if (!user || !user.isActif || !timingSafeEqual(Buffer.from(session.passwordVersion), Buffer.from(passwordVersion(user.password)))) return null;
  // Read role/activation in the database, never from browser data or a stale cookie.
  const { password: _password, isActif: _isActif, ...safeUser } = user;
  void _password; void _isActif;
  return safeUser;
}

export function checkOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (request.headers.get("sec-fetch-site") === "cross-site" || (origin && origin !== new URL(request.url).origin)) {
    throw new AuthError("Origine de la requête refusée.", 403);
  }
}

export async function requireAdmin(request?: Request) {
  if (request && !["GET", "HEAD"].includes(request.method)) checkOrigin(request);
  const user = await getCurrentUser();
  if (!user) throw new AuthError("Veuillez vous connecter.", 401);
  if (user.role !== "ADMIN") throw new AuthError("Accès réservé aux administrateurs.", 403);
  return user;
}

export function authJson(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "private, no-store", Vary: "Cookie" } });
}

export function authError(error: unknown) {
  if (error instanceof AuthError) return authJson({ error: error.message }, error.status);
  if (error instanceof z.ZodError) return authJson({ error: "Données invalides.", issues: error.issues }, 400);
  if (error instanceof SyntaxError) return authJson({ error: "Corps JSON incorrect." }, 400);
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return authJson({ error: "Cette adresse e-mail est déjà utilisée." }, 409);
  console.error("Authentication request failed", error instanceof Error ? error.name : "UnknownError");
  return authJson({ error: "Authentification indisponible. Veuillez réessayer." }, 503);
}

export async function readAuthBody(request: Request) {
  checkOrigin(request);
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") throw new AuthError("Un corps JSON est requis.", 415);
  return request.json();
}

// Small, bounded per-process limit. A shared rate limit is needed for multiple instances.
const globalAuth = globalThis as typeof globalThis & { authAttempts?: Map<string, { count: number; until: number }> };
const attempts = globalAuth.authAttempts ??= new Map();
export function limitAuthAttempt(key: string) {
  const now = Date.now();
  for (const [entry, value] of attempts) if (value.until <= now) attempts.delete(entry);
  const current = attempts.get(key);
  if (current && current.count >= 10) throw new AuthError("Trop de tentatives. Réessayez dans 15 minutes.", 429);
  if (!current && attempts.size >= 10000) throw new AuthError("Trop de requêtes. Réessayez plus tard.", 429);
  attempts.set(key, current ? { ...current, count: current.count + 1 } : { count: 1, until: now + 15 * 60 * 1000 });
}
