import { Prisma } from "@/app/generated/prisma/client";
import { z } from "zod";

// Shared server rule for checkout display and order creation.
const deliveryFeeSchema = z.string().trim().regex(/^\d+(?:\.\d{1,3})?$/)
  .transform(value => new Prisma.Decimal(value))
  .refine(value => value.isFinite() && value.gte(0) && value.lte("999999999999999.999"));

export function readDeliveryFee() {
  return deliveryFeeSchema.safeParse(process.env.ORDER_DELIVERY_FEE_TND);
}
