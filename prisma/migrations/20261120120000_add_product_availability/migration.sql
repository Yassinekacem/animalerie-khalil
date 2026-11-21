CREATE TYPE "ProductAvailability" AS ENUM ('DISPONIBLE', 'EN_ARRIVAGE', 'RUPTURE_STOCK');

ALTER TABLE "Product" ADD COLUMN "availability" "ProductAvailability" NOT NULL DEFAULT 'DISPONIBLE';
