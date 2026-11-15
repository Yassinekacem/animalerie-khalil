import { authError, authJson, getCurrentUser } from "@/lib/auth";
import { connection } from "next/server";

export async function GET() {
  await connection();
  try { return authJson({ user: await getCurrentUser() }); }
  catch (error) { return authError(error); }
}
