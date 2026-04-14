ALTER TABLE "Bill" ADD COLUMN "subtotalAmount" REAL NOT NULL DEFAULT 0;
ALTER TABLE "Bill" ADD COLUMN "gstRate" REAL NOT NULL DEFAULT 0;
ALTER TABLE "Bill" ADD COLUMN "gstAmount" REAL NOT NULL DEFAULT 0;

UPDATE "Bill"
SET
  "subtotalAmount" = "totalAmount",
  "gstRate" = 0,
  "gstAmount" = 0
WHERE "subtotalAmount" = 0 AND "gstRate" = 0 AND "gstAmount" = 0;
