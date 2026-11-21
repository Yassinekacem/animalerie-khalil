-- Les profils et commandes existants conservent une localisation inconnue (NULL).
ALTER TABLE "User"
ADD COLUMN "gouvernorat" TEXT,
ADD COLUMN "ville" TEXT;

ALTER TABLE "Order"
ADD COLUMN "gouvernorat" TEXT,
ADD COLUMN "ville" TEXT;
