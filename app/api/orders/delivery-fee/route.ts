import { connection } from "next/server";
import { readDeliveryFee } from "@/lib/order-delivery";

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET() {
  await connection();
  const fee = readDeliveryFee();
  if (!fee.success) {
    return json({ error: "Frais de livraison non configurés ou invalides.", code: "DELIVERY_FEE_NOT_CONFIGURED" }, 503);
  }
  return json({ deliveryFee: fee.data.toFixed(3) });
}
