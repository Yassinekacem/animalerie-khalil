ALTER TABLE "Order"
ADD COLUMN "idempotencyKeyHash" TEXT,
ADD COLUMN "requestHash" TEXT;

CREATE UNIQUE INDEX "Order_idempotencyKeyHash_key" ON "Order"("idempotencyKeyHash");
