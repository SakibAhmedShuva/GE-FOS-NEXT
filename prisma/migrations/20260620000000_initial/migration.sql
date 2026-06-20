-- Initial PostgreSQL schema for the Financial Offer System Next.js/Node migration.
-- Created from prisma/schema.prisma so the project has a real migration baseline.

CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'USER');
CREATE TYPE "ProjectType" AS ENUM ('OFFER', 'CHALLAN', 'PURCHASE_ORDER', 'AI_HELPER');
CREATE TYPE "ProjectStatus" AS ENUM ('PENDING', 'DELIVERED', 'ARCHIVED');
CREATE TYPE "SourceType" AS ENUM ('FOREIGN', 'LOCAL', 'CUSTOM');
CREATE TYPE "SharePermission" AS ENUM ('VIEW', 'EDIT');
CREATE TYPE "ReviewStatus" AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE "ReviewVisibility" AS ENUM ('USER', 'ADMIN');
CREATE TYPE "NotificationType" AS ENUM ('REVIEW', 'PROJECT_SHARE', 'ADMIN_MESSAGE', 'EXPORT', 'CHAT', 'SYSTEM');
CREATE TYPE "ExportType" AS ENUM ('PDF', 'XLSX');
CREATE TYPE "DocumentType" AS ENUM ('OFFER', 'PURCHASE_ORDER', 'CHALLAN');
CREATE TYPE "MigrationSeverity" AS ENUM ('INFO', 'WARNING', 'ERROR');

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "legacySerial" TEXT,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "role" "UserRole" NOT NULL DEFAULT 'USER',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "passwordResetRequired" BOOLEAN NOT NULL DEFAULT true,
  "legacyPasswordImportedAt" TIMESTAMP(3),
  "lastLoginAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

CREATE TABLE "Client" (
  "id" TEXT NOT NULL,
  "legacySerial" TEXT,
  "clientName" TEXT NOT NULL,
  "clientAddress" TEXT,
  "searchText" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Client_clientName_idx" ON "Client"("clientName");

CREATE TABLE "PriceListImport" (
  "id" TEXT NOT NULL,
  "sourceType" "SourceType" NOT NULL,
  "filename" TEXT NOT NULL,
  "uploadedById" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "rowCount" INTEGER NOT NULL DEFAULT 0,
  "errorCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PriceListImport_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CatalogItem" (
  "id" TEXT NOT NULL,
  "sourceType" "SourceType" NOT NULL,
  "productType" TEXT,
  "itemCode" TEXT,
  "make" TEXT,
  "approvals" TEXT,
  "model" TEXT,
  "descriptionHtml" TEXT NOT NULL,
  "descriptionPlain" TEXT NOT NULL,
  "poPrice" DECIMAL(18,4),
  "offerPrice" DECIMAL(18,4),
  "installationPrice" DECIMAL(18,4),
  "unit" TEXT,
  "metadata" JSONB,
  "searchText" TEXT NOT NULL DEFAULT '',
  "embedding" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "importId" TEXT,
  CONSTRAINT "CatalogItem_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CatalogItem_sourceType_idx" ON "CatalogItem"("sourceType");
CREATE INDEX "CatalogItem_productType_idx" ON "CatalogItem"("productType");
CREATE INDEX "CatalogItem_itemCode_idx" ON "CatalogItem"("itemCode");
CREATE INDEX "CatalogItem_make_idx" ON "CatalogItem"("make");
CREATE INDEX "CatalogItem_model_idx" ON "CatalogItem"("model");

CREATE TABLE "PriceListImportError" (
  "id" TEXT NOT NULL,
  "importId" TEXT NOT NULL,
  "rowNumber" INTEGER,
  "sheetName" TEXT,
  "message" TEXT NOT NULL,
  "rawData" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PriceListImportError_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Project" (
  "id" TEXT NOT NULL,
  "legacyProjectId" TEXT,
  "referenceNumber" TEXT NOT NULL,
  "projectType" "ProjectType" NOT NULL,
  "status" "ProjectStatus" NOT NULL DEFAULT 'PENDING',
  "ownerUserId" TEXT NOT NULL,
  "parentProjectId" TEXT,
  "clientSnapshot" JSONB,
  "legacyJson" JSONB,
  "metadata" JSONB,
  "lastModifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Project_legacyProjectId_key" ON "Project"("legacyProjectId");
CREATE INDEX "Project_referenceNumber_idx" ON "Project"("referenceNumber");
CREATE INDEX "Project_projectType_idx" ON "Project"("projectType");
CREATE INDEX "Project_status_idx" ON "Project"("status");
CREATE INDEX "Project_ownerUserId_idx" ON "Project"("ownerUserId");

CREATE TABLE "ProjectItem" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "sourceType" "SourceType" NOT NULL,
  "catalogItemId" TEXT,
  "itemCode" TEXT,
  "productType" TEXT,
  "make" TEXT,
  "model" TEXT,
  "approvals" TEXT,
  "descriptionHtml" TEXT,
  "descriptionPlain" TEXT,
  "qty" DECIMAL(18,4),
  "unit" TEXT,
  "foreignPriceUsd" DECIMAL(18,4),
  "foreignTotalUsd" DECIMAL(18,4),
  "localSupplyPriceBdt" DECIMAL(18,4),
  "localSupplyTotalBdt" DECIMAL(18,4),
  "installationPriceBdt" DECIMAL(18,4),
  "installationTotalBdt" DECIMAL(18,4),
  "poPriceUsd" DECIMAL(18,4),
  "poTotalUsd" DECIMAL(18,4),
  "poPriceBdt" DECIMAL(18,4),
  "isCustom" BOOLEAN NOT NULL DEFAULT false,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProjectItem_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ProjectItem_projectId_idx" ON "ProjectItem"("projectId");
CREATE INDEX "ProjectItem_catalogItemId_idx" ON "ProjectItem"("catalogItemId");
CREATE INDEX "ProjectItem_sourceType_idx" ON "ProjectItem"("sourceType");

CREATE TABLE "OfferSetting" (
  "projectId" TEXT NOT NULL,
  "financials" JSONB,
  "financialLabels" JSONB,
  "visibleColumns" JSONB,
  "selectedCoverId" TEXT,
  "isSummaryPageEnabled" BOOLEAN NOT NULL DEFAULT false,
  "summaryScopeDescriptions" JSONB,
  "tncState" JSONB,
  "includeSignature" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OfferSetting_pkey" PRIMARY KEY ("projectId")
);

CREATE TABLE "ProjectShare" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "ownerUserId" TEXT NOT NULL,
  "sharedWithUserId" TEXT NOT NULL,
  "permission" "SharePermission" NOT NULL DEFAULT 'VIEW',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProjectShare_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ProjectShare_projectId_sharedWithUserId_key" ON "ProjectShare"("projectId", "sharedWithUserId");
CREATE INDEX "ProjectShare_ownerUserId_idx" ON "ProjectShare"("ownerUserId");
CREATE INDEX "ProjectShare_sharedWithUserId_idx" ON "ProjectShare"("sharedWithUserId");

CREATE TABLE "ReviewRequest" (
  "id" TEXT NOT NULL,
  "legacyRequestId" TEXT,
  "userId" TEXT NOT NULL,
  "projectId" TEXT,
  "requestType" TEXT NOT NULL,
  "itemCode" TEXT,
  "details" JSONB,
  "status" "ReviewStatus" NOT NULL DEFAULT 'DRAFT',
  "visibility" "ReviewVisibility" NOT NULL DEFAULT 'USER',
  "remarks" TEXT,
  "processedByUserId" TEXT,
  "processedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReviewRequest_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ReviewRequest_legacyRequestId_key" ON "ReviewRequest"("legacyRequestId");

CREATE TABLE "Notification" (
  "id" TEXT NOT NULL,
  "legacyId" TEXT,
  "userId" TEXT NOT NULL,
  "type" "NotificationType" NOT NULL DEFAULT 'SYSTEM',
  "title" TEXT,
  "messageHtml" TEXT NOT NULL,
  "isRead" BOOLEAN NOT NULL DEFAULT false,
  "actionUrl" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "readAt" TIMESTAMP(3),
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Notification_legacyId_key" ON "Notification"("legacyId");
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");

CREATE TABLE "ChatMessage" (
  "id" TEXT NOT NULL,
  "legacyMessageId" TEXT,
  "senderUserId" TEXT NOT NULL,
  "recipientUserId" TEXT NOT NULL,
  "message" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "readAt" TIMESTAMP(3),
  CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ChatMessage_legacyMessageId_key" ON "ChatMessage"("legacyMessageId");
CREATE INDEX "ChatMessage_senderUserId_recipientUserId_createdAt_idx" ON "ChatMessage"("senderUserId", "recipientUserId", "createdAt");
CREATE INDEX "ChatMessage_recipientUserId_readAt_idx" ON "ChatMessage"("recipientUserId", "readAt");

CREATE TABLE "ChatAttachment" (
  "id" TEXT NOT NULL,
  "messageId" TEXT,
  "storageKey" TEXT NOT NULL,
  "originalFilename" TEXT NOT NULL,
  "mimeType" TEXT,
  "sizeBytes" INTEGER,
  "uploadedByUserId" TEXT NOT NULL,
  "legacyFilename" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ChatAttachment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ChatAttachment_messageId_idx" ON "ChatAttachment"("messageId");

CREATE TABLE "UserPresence" (
  "userId" TEXT NOT NULL,
  "socketId" TEXT,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserPresence_pkey" PRIMARY KEY ("userId")
);

CREATE TABLE "Cover" (
  "id" TEXT NOT NULL,
  "filename" TEXT NOT NULL,
  "storageKey" TEXT NOT NULL,
  "thumbnailStorageKey" TEXT,
  "uploadedByUserId" TEXT,
  "projectReference" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Cover_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Cover_storageKey_key" ON "Cover"("storageKey");
CREATE INDEX "Cover_filename_idx" ON "Cover"("filename");
CREATE INDEX "Cover_projectReference_idx" ON "Cover"("projectReference");

CREATE TABLE "Export" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "exportType" "ExportType" NOT NULL,
  "documentType" "DocumentType" NOT NULL,
  "filename" TEXT NOT NULL,
  "storageKey" TEXT NOT NULL,
  "generatedByUserId" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Export_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Export_storageKey_key" ON "Export"("storageKey");
CREATE INDEX "Export_projectId_idx" ON "Export"("projectId");
CREATE INDEX "Export_documentType_idx" ON "Export"("documentType");

CREATE TABLE "ChallanSequence" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL DEFAULT 'default',
  "currentRef" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ChallanSequence_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ChallanSequence_key_key" ON "ChallanSequence"("key");

CREATE TABLE "ChallanLog" (
  "id" TEXT NOT NULL,
  "legacyRowNumber" INTEGER,
  "ref" TEXT NOT NULL,
  "date" TIMESTAMP(3),
  "clientName" TEXT,
  "description" TEXT,
  "signedCopyReceived" TEXT,
  "remarks" TEXT,
  "challanCarrier" TEXT,
  "preparedByUserId" TEXT,
  "projectId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ChallanLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ChallanLog_ref_idx" ON "ChallanLog"("ref");
CREATE INDEX "ChallanLog_projectId_idx" ON "ChallanLog"("projectId");

CREATE TABLE "ActivityLog" (
  "id" TEXT NOT NULL,
  "actorUserId" TEXT,
  "actorNameSnapshot" TEXT,
  "action" TEXT NOT NULL,
  "entityType" TEXT,
  "entityId" TEXT,
  "projectId" TEXT,
  "referenceNumber" TEXT,
  "filePathOrStorageKey" TEXT,
  "metadata" JSONB,
  "legacyRow" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ActivityLog_actorUserId_idx" ON "ActivityLog"("actorUserId");
CREATE INDEX "ActivityLog_projectId_idx" ON "ActivityLog"("projectId");
CREATE INDEX "ActivityLog_createdAt_idx" ON "ActivityLog"("createdAt");

CREATE TABLE "AppSetting" (
  "key" TEXT NOT NULL,
  "value" JSONB NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("key")
);

CREATE TABLE "MigrationRun" (
  "id" TEXT NOT NULL,
  "sourceRoot" TEXT NOT NULL,
  "report" JSONB,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" TIMESTAMP(3),
  "createdBy" TEXT,
  CONSTRAINT "MigrationRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MigrationError" (
  "id" TEXT NOT NULL,
  "runId" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "severity" "MigrationSeverity" NOT NULL DEFAULT 'ERROR',
  "message" TEXT NOT NULL,
  "rawData" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MigrationError_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "PriceListImport" ADD CONSTRAINT "PriceListImport_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CatalogItem" ADD CONSTRAINT "CatalogItem_importId_fkey" FOREIGN KEY ("importId") REFERENCES "PriceListImport"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PriceListImportError" ADD CONSTRAINT "PriceListImportError_importId_fkey" FOREIGN KEY ("importId") REFERENCES "PriceListImport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Project" ADD CONSTRAINT "Project_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Project" ADD CONSTRAINT "Project_parentProjectId_fkey" FOREIGN KEY ("parentProjectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProjectItem" ADD CONSTRAINT "ProjectItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectItem" ADD CONSTRAINT "ProjectItem_catalogItemId_fkey" FOREIGN KEY ("catalogItemId") REFERENCES "CatalogItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OfferSetting" ADD CONSTRAINT "OfferSetting_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OfferSetting" ADD CONSTRAINT "OfferSetting_selectedCoverId_fkey" FOREIGN KEY ("selectedCoverId") REFERENCES "Cover"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProjectShare" ADD CONSTRAINT "ProjectShare_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectShare" ADD CONSTRAINT "ProjectShare_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProjectShare" ADD CONSTRAINT "ProjectShare_sharedWithUserId_fkey" FOREIGN KEY ("sharedWithUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReviewRequest" ADD CONSTRAINT "ReviewRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReviewRequest" ADD CONSTRAINT "ReviewRequest_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReviewRequest" ADD CONSTRAINT "ReviewRequest_processedByUserId_fkey" FOREIGN KEY ("processedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_senderUserId_fkey" FOREIGN KEY ("senderUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ChatAttachment" ADD CONSTRAINT "ChatAttachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "ChatMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ChatAttachment" ADD CONSTRAINT "ChatAttachment_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UserPresence" ADD CONSTRAINT "UserPresence_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Cover" ADD CONSTRAINT "Cover_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Export" ADD CONSTRAINT "Export_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Export" ADD CONSTRAINT "Export_generatedByUserId_fkey" FOREIGN KEY ("generatedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ChallanLog" ADD CONSTRAINT "ChallanLog_preparedByUserId_fkey" FOREIGN KEY ("preparedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ChallanLog" ADD CONSTRAINT "ChallanLog_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MigrationError" ADD CONSTRAINT "MigrationError_runId_fkey" FOREIGN KEY ("runId") REFERENCES "MigrationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "AppSetting" ("key", "value") VALUES
  ('offer.bdt_conversion_rate', '{"value":125}'::jsonb),
  ('offer.customs_duty_percentage', '{"value":16}'::jsonb);
