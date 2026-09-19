-- CreateEnum
CREATE TYPE "PodcastFeatureRequestStatus" AS ENUM ('NEW', 'REVIEWED', 'ACCEPTED', 'DECLINED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "PodcastFeatureRequest" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "PodcastFeatureRequestStatus" NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PodcastFeatureRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PodcastFeatureRequest_status_createdAt_idx" ON "PodcastFeatureRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "PodcastFeatureRequest_email_idx" ON "PodcastFeatureRequest"("email");
