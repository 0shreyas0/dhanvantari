<div align="center">
  
# ⚕️ Dhanvantari
### Intelligent Pharmacy Inventory Management System

[![Next.js](https://img.shields.io/badge/Next.js-15.0-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma-6.0-2D3748?style=for-the-badge&logo=prisma)](https://www.prisma.io/)
[![Live Demo](https://img.shields.io/badge/Live_Demo-Visit-blue?style=for-the-badge)](https://dhanvantari-five.vercel.app)

*A next-generation pharmacy management platform designed to modernize independent pharmacies.*

</div>

---

## 🌟 Overview

**Dhanvantari** is a comprehensive pharmacy management system that expands beyond traditional inventory tracking to include seamless **Point-of-Sale (POS) billing**, real-time profit analytics, intelligent stock forecasting, financial reporting, and automated notifications. By leveraging webcam-based barcode scanning, integrated WhatsApp messaging, email alerts, and advanced settings management, Dhanvantari eliminates manual entry errors and creates a frictionless workflow from stock intake to customer checkout and beyond.

## ✨ Key Features

- **🎯 Unified Dashboard:** Central command center showing stock health, daily sales, profit analytics, and quick actions.
- **📸 Barcode Scanning Engine:** Webcam-based scanner identifying products for both Inventory Management and Billing.
- **💳 Integrated POS Billing:** Create customer bills, calculate totals with GST, remove items from stock, generate digital receipts, and PDF bills.
- **📦 Smart Inventory Management:** Full CRUD operations for medicines (Name, Stock, Cost/Selling Price, Expiry, Batch ID) with batch tracking.
- **🛡️ Expiry Safety Lock:** Prevents sale of expired items and alerts staff immediately during checkout.
- **⚠️ Low Stock Alerts:** Auto-highlighting of items below threshold (e.g., < 10 units) for proactive ordering.
- **💰 Finance Analytics:** Real-time profit tracking, revenue reports, and financial insights.
- **📱 WhatsApp Integration:** Automated notifications for low stock, expiry alerts, and customer communications.
- **📧 Email System:** Send emails for receipts, alerts, and notifications.
- **⚙️ Settings Management:** Configure pharmacy details, user preferences, and system settings.
- **🔍 Product Search & Management:** Advanced product catalog with search and categorization.

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
4. **Add to Bill:** Item added to current cart, price calculated with GST.
5. **Checkout:** Sale is completed, stock decrements immediately, and revenue updates in real-time.
6. **Receipt:** Digital bill generated for the customer, with PDF option.

## 🛠️ Tech Stack

- **Frontend framework:** Next.js (App Router)
- **Styling:** Tailwind CSS
- **Language:** TypeScript
- **Database ORM:** Prisma
- **Icons:** Lucide React
- **Authentication:** Clerk
- **Deployment:** Vercel

## 📈 Goals & Objectives

- **Reduce inventory overhead by 70%** through automated stock tracking.
- **Streamline the checkout process** to under 30 seconds per customer.
- **Minimize revenue loss** from expired medicines by providing advance warnings.
- **Enable data-driven purchasing decisions** through vendor integration and alerts.
- **Enhance customer experience** with quick billing and digital receipts.
- **Improve operational efficiency** with automated notifications and analytics.

---

<div align="center">
  <i>Built to modernize and simplify pharmacy day-to-day operations.</i>
  <br>
  <a href="https://dhanvantari-five.vercel.app">🌐 Live Demo</a>
</div>
