---
description: How to implement advanced Serialization, Aggregation, and Track-and-Trace (DSCSA) features in Dhanvantari.
---

# Advanced Pharmacy Track-and-Trace Workflow

The text provided outlines an enterprise-level, globally connected pharmacy supply chain system governed by Serialization (unique IDs per bottle) and Aggregation (Parent-Child container relationships).

Here is an analysis of what Dhanvantari can achieve today, and the exact steps to implement the missing pieces.

## What We Already Achieve
✅ **Inventory & Storage (Expiry Monitoring):** We already track Expiration Dates and Batch Numbers and actively flash alerts (Critical Expiry Watchlist) for items nearing expiry.
✅ **Dispensing (Basic):** We scan items at the POS to deduct stock and create a transaction record.
✅ **Secondary/2D Barcodes (Simulated):** We already generate and print 2D QR Codes on our stickers that encode medicine name, barcode, price, and batch number.

## What We Can Achieve (Next Steps)

With our current Next.js + Prisma + PostgreSQL stack, we can absolutely build a local version of "Track and Trace"!

### 1. Unique Serialization (Preventing Double-Dispensing)
Currently, Dhanvantari tracks **Batches** (e.g., "140 units in Batch B101"). Real serialization tracks **individual bottles** (e.g., "Bottle #99991 from Batch B101").

**Implementation Steps:**
1. Update `prisma/schema.prisma` to create a `SerialNumber` model linked to a `Batch`.
   ```prisma
   model SerialNumber {
     id          String   @id @default(uuid())
     batchId     String
     code        String   @unique
     status      String   @default("ACTIVE") // ACTIVE, DISPENSED, DESTROYED, RECALLED
     dispensedAt DateTime?
     batch       Batch    @relation(fields: [batchId], references: [id])
   }
   ```
2. When creating new stock (Intake), generate unique UUIDs for each unit and save them.
3. Update the Billing Scanner to scan these specific `SerialNumber.code`s instead of generic product barcodes.
4. On checkout, mark the specific `SerialNumber` as `DISPENSED`. If a user scans a `DISPENSED` code again, block it!

### 2. Recalls & Disposal Tracking
**Implementation Steps:**
1. Add an `isRecalled Boolean @default(false)` field to the `Batch` model.
2. Create an admin dashboard panel to "Issue Recall" for a Batch.
3. Automatically block billing for any items in a recalled batch and display a huge red warning on the POS.
4. Add a "Returns/Disposal" scanning mode. Scan a product to change its `SerialNumber` state to `DESTROYED`, keeping it tracked but removing it from active stock numbers.

### 3. Aggregation (Parent-Child Receiving)
Instead of manually typing that 100 bottles arrived, we can simulate receiving a "Tertiary" carton.

**Implementation Steps:**
1. Create a "Receive Shipment" page.
2. The user types a "Master Carton Barcode".
3. The system creates a new `Batch` and auto-generates 100 `SerialNumbers` linked to that Master Carton.

## What We CANNOT Achieve (Right Now)
❌ **National Verification System Pings:** Real pharmacies ping a government/manufacturer database (like DSCSA router or EMVS) to verify the serial number didn't come from a counterfeit factory. We cannot do this without access to those external, highly-regulated APIs.
❌ **GS1 DataMatrix Standard Prefix Parsing:** Standard GS1 barcodes contain hidden application identifiers (e.g., `(01)` for GTIN, `(17)` for Expiry). Without a specialized decoding library, standard web scanners struggle to parse all these hidden characters perfectly.

---

**Do you want to run this workflow?** If you ask me to "Implement Serialization," I will begin executing Step 1 immediately!