-- CreateEnum
CREATE TYPE "Animal" AS ENUM ('chien', 'chat', 'oiseaux', 'poissons');

-- CreateTable
CREATE TABLE "Product" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "brand" TEXT,
    "targetAnimal" "Animal" NOT NULL,
    "category" TEXT NOT NULL,
    "image" TEXT NOT NULL DEFAULT '',
    "price" DECIMAL(10,3) NOT NULL,
    "promoPrice" DECIMAL(10,3),
    "characteristics" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);
