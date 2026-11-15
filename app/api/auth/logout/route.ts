import { authError, authJson, checkOrigin, endSession } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    checkOrigin(request);
    await endSession();
    return authJson({ success: true });
  } catch (error) { return authError(error); }
}
