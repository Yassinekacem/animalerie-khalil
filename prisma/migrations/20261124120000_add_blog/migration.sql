CREATE TABLE "Blog" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "category" "Animal" NOT NULL,
    "image" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Blog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Blog_createdAt_id_idx" ON "Blog"("createdAt", "id");
CREATE INDEX "Blog_category_createdAt_id_idx" ON "Blog"("category", "createdAt", "id");
