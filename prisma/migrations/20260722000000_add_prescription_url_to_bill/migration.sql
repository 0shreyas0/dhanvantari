-- Add prescriptionUrl column to Bill table for UploadThing prescription storage
ALTER TABLE "Bill" ADD COLUMN "prescriptionUrl" TEXT;
