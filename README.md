<div align="center">
  
# ⚕️ Dhanvantari
### Intelligent Pharmacy Inventory Management System

[![Next.js](https://img.shields.io/badge/Next.js-15.0-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma-6.0-2D3748?style=for-the-badge&logo=prisma)](https://www.prisma.io/)

*A next-generation pharmacy management platform designed to modernize independent pharmacies.*

</div>

---

## 🌟 Overview

**Dhanvantari** expands the scope of traditional pharmacy management to include seamless **Point-of-Sale (POS) billing**, real-time profit analytics, and intelligent stock forecasting. By leveraging webcam-based barcode scanning, Dhanvantari eliminates manual entry errors and creates a frictionless workflow from stock intake to customer checkout.

## ✨ Key Features

- **🎯 Unified Dashboard:** Central command center showing stock health, daily sales, and quick actions.
- **📸 Barcode Scanning Engine:** Webcam-based scanner identifying products for both Inventory Management and Billing.
- **💳 Integrated POS Billing:** Create customer bills, calculate totals, remove items from stock, and generate digital receipts instantly.
- **📦 Smart Inventory Management:** Full CRUD operations for medicines (Name, Stock, Cost/Selling Price, Expiry, Batch ID).
- **🛡️ Expiry Safety Lock:** Prevents sale of expired items and alerts staff immediately during checkout.
- **⚠️ Low Stock Alerts:** Auto-highlighting of items below threshold (e.g., < 10 units) for proactive ordering.

## 🚀 Getting Started

First, install the dependencies:

```bash
npm install
# or
yarn install
# or
pnpm install
```

Then, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 💡 The "Scan & Bill" Workflow

1. **Customer Arrival:** Customer brings items to the counter.
2. **Scan:** Staff uses Dhanvantari's webcam scanner.
3. **Identify:** System recognizes barcode, validates expiry date.
4. **Add to Bill:** Item added to current cart, price calculated.
5. **Checkout:** Sale is completed, stock decrements immediately, and revenue updates in real-time.
6. **Receipt:** Digital bill generated for the customer.

## 🛠️ Tech Stack

- **Frontend framework:** Next.js (App Router)
- **Styling:** Tailwind CSS
- **Language:** TypeScript
- **Database ORM:** Prisma
- **Icons:** Lucide React

## 📈 Goals & Objectives

- **Reduce inventory overhead by 70%** through automated stock tracking.
- **Streamline the checkout process** to under 30 seconds per customer.
- **Minimize revenue loss** from expired medicines by providing advance warnings.
- **Enable data-driven purchasing decisions** through vendor integration and alerts.

---

<div align="center">
  <i>Built to modernize and simplify pharmacy day-to-layer operations.</i>
</div>
