---
description: Integration Plan for Advanced Pharmacy Features
---

# Integration Workflow: Medicotary Features

This workflow outlines the step-by-step process to upgrade our basic inventory app into a feature-rich Pharmacy OS, inspired by the Medicotary analysis.

## Phase 1: Data Structure & Types
Before UI changes, we need to support richer data.

1.  **Define Types**: Create/Update `types/inventory.ts` to include:
    *   `costPrice` and `sellingPrice`
    *   `preferredVendor`
    *   `imageUrl` (optional)
    *   `lowStockThreshold` (for alerts)
    *   `expiryDate`

## Phase 2: Enhanced Inventory Table
 Upgrade the current `InventoryTable.tsx` to display this new data.

1.  **Update Columns**:
    *   Add **Image Column**: Use `Avatar` component for medicine thumbnail.
    *   Add **Pricing Column**: Show Selling Price (maybe Cost price only visible to admin/on hover).
    *   Add **Vendor Column**: Show badge or text for the vendor.
2.  **Add Search & Filtering**:
    *   Implement a search bar (referenced in `LEARNINGS.md`) to filter the table by name or barcode.

## Phase 3: Smart Dashboard Widgets
Turn the static dashboard header into an active command center.

1.  **Create "Stat Cards"**:
    *   Build a reusable `StatCard` component.
    *   Implement **"Low Stock Alert"** card: Count items where `stock < lowStockThreshold`.
    *   Implement **"Out of Stock"** card: Count items where `stock === 0`.
    *   Implement **"Total Value"** card: `sum(stock * costPrice)`.
2.  **Layout Update**:
    *   Inject these cards into `DashboardPage` (app/page.tsx) above the table.

## Phase 4: Vendor Managment (Future Expansions)
1.  **Add Vendor Logic**:
    *   Create a basic Vendor interface/modal to add new suppliers.
    *   Link medicines to these vendors.

## Execution Checklist
- [ ] Create TypeScript interfaces.
- [ ] Update Mock Data in `InventoryTable` to include new fields (images, dual prices).
- [ ] Refactor `InventoryTable` columns to show new data.
- [ ] Build `DashboardStats` component group.
- [ ] Add Search Bar to `ActionButtons` area.
