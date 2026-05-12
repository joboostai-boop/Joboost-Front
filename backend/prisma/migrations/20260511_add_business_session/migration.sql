-- AlterEnum: Add BUSINESS_PARTNER to Role enum
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'BUSINESS_PARTNER';

-- CreateTable: BusinessOffer
CREATE TABLE "BusinessOffer" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "contractType" TEXT,
    "location" TEXT,
    "salaryRange" TEXT,
    "requiredSkills" TEXT[],
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable: BusinessAffiliation
CREATE TABLE "BusinessAffiliation" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "jobseekerId" TEXT NOT NULL,
    "affiliatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'active',

    CONSTRAINT "BusinessAffiliation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Unique constraint on business-jobseeker pair
CREATE UNIQUE INDEX "BusinessAffiliation_businessId_jobseekerId_key" ON "BusinessAffiliation"("businessId", "jobseekerId");

-- AddForeignKey: BusinessOffer -> User
ALTER TABLE "BusinessOffer" ADD CONSTRAINT "BusinessOffer_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: BusinessAffiliation -> User (business)
ALTER TABLE "BusinessAffiliation" ADD CONSTRAINT "BusinessAffiliation_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: BusinessAffiliation -> User (jobseeker)
ALTER TABLE "BusinessAffiliation" ADD CONSTRAINT "BusinessAffiliation_jobseekerId_fkey" FOREIGN KEY ("jobseekerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
