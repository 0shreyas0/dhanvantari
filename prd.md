# Dhanvantari: Intelligent Pharmacy Operations System

## 1. Executive Summary

**Dhanvantari** is a next-generation pharmacy management platform designed to modernize independent pharmacies. Building on the core concepts of inventory tracking (inspired by *Medicotary*), Dhanvantari expands the scope to include seamless **Point-of-Sale (POS) billing**, real-time profit analytics, and intelligent stock forecasting. By leveraging webcam-based barcode scanning, Dhanvantari eliminates manual entry errors and creates a frictionless workflow from stock intake to customer checkout.

## 2. Goals & Objectives

### Business Goals
*   **Reduce inventory management overhead by 70%** through automated stock tracking.
*   **Streamline the checkout process** to under 30 seconds per customer with integrated billing.
*   **Minimize revenue loss** from expired medicines by providing 30-day advance warnings.
*   **Enable data-driven purchasing decisions** through vendor integration and low-stock alerts.

### User Goals
*   **Scan & Sell:** Instantly identify products and generate bills via barcode.
*   **Inventory Visibility:** Quickly identify medicines nearing expiry or low stock levels.
*   **Financial Clarity:** Access real-time profit margins and daily sales reports.
*   **Stock Reliability:** Never run out of essential medicines with predictive restock alerts.

### Non-Goals (MVP Phase)
*   Integration with national insurance claim systems (future phase).
*   Patient electronic health records (EHR) deep integration.
*   Mobile app for customers (staff-facing web app only).

---

## 3. User Personas & Stories

### Primary Persona: Sarah, Pharmacy Owner
*   **As a owner,** I need a system that handles both inventory and billing so I don't need two separate tools.
*   **As a manager,** I need to track which products are selling fastest to optimize my shelf space.
*   **As a pharmacist,** I need to be warned if I'm about to sell an expired item to ensure patient safety.

### Secondary Persona: Jake, Counter Staff
*   **As a cashier,** I need to generate a compliant bill/receipt quickly for the customer.
*   **As a stock clerk,** I need to easily add new batches of medicine when shipments arrive.

---

## 4. Functional Requirements

### P0: Core Essentials (MVP)
| ID | Feature | Description |
| :--- | :--- | :--- |
| **FR-01** | **Unified Dashboard** | Central command center showing stock health, daily sales, and quick actions. |
| **FR-02** | **Barcode Scanning Engine** | Webcam-based scanner identifying products for both **Inventory Management** and **Billing**. |
| **FR-03** | **Integrated Billing (POS)** | Create customer bills, calculate totals, remove items from stock, and generate digital receipts. |
| **FR-04** | **Inventory CRUD** | Manage medicines: Name, Stock, Cost Price, Selling Price, Expiry, Batch ID. |
| **FR-05** | **Expiry Safety Lock** | Prevent sale of expired items and alert staff immediately during checkout. |

### P1: Intelligence & Operations (Launch)
| ID | Feature | Description |
| :--- | :--- | :--- |
| **FR-06** | **Low Stock Alerts** | Auto-highlighting of items below threshold (e.g., < 10 units). |
| **FR-07** | **Visual Indicators** | Color-coded rows (Red = Expired, Yellow = Low Stock) for instant recognition. |
| **FR-08** | **Incoming Deliveries** | Track "Products To Be Arrived" to manage expectated vendor shipments. |
| **FR-09** | **Vendor Management** | Database of suppliers linked to batches for easier reordering. |
| **FR-10** | **Product Images** | Display medicine thumbnails in tables and on the billing screen for verification. |

### P2: Advanced Analytics (Post-Launch)
| ID | Feature | Description |
| :--- | :--- | :--- |
| **FR-11** | **Profit & Loss Engine** | Real-time calculation of (Selling Price - Cost Price) per transaction. |
| **FR-12** | **Smart Reordering** | One-click purchase order generation based on sales velocity and low stock. |
| **FR-13** | **Sales Reports** | Daily/Weekly/Monthly exportable reports for accounting. |
| **FR-14** | **Customer Profiles** | Basic CRM to track regular customers and their purchase history. |

---

## 5. User Experience (UX) & Flows

### Primary Flow: The "Scan & Bill" Linked Workflow
1.  **Customer Arrival:** Customer brings items to the counter.
2.  **Scan:** Staff uses **Dhanvantari** webcam scanner.
3.  **Identify:** System recognizes barcode, shows "Amoxicillin 500mg - Batch #B202".
    *   *Check:* System verifies expiry date > today.
4.  **Add to Bill:** Item added to current cart. Price calculated.
5.  **Checkout:** Staff clicks "Complete Sale".
    *   **Stock Update:** Inventory count decremented immediately.
    *   **Revenue Update:** Sales and profit logged to dashboard.
6.  **Receipt:** Bill generated for customer.

### Secondary Flow: Stock Intake
1.  **Arrival:** New shipment arrives from Vendor.
2.  **Scan/Entry:** Staff scans new box. System prompts "Add Stock".
3.  **Input:** Staff enters Batch ID, Expiry Date, and Cost Price.
4.  **Update:** Inventory updated. "Products To Be Arrived" queue cleared.

---

## 6. Technical Specifications

### Enhancement to Data Model
*   **Transaction:** Now supports `type: 'POS_SALE' | 'RESTOCK' | 'ADJUSTMENT'` and includes `billId`.
*   **Bill/Invoice:** `id`, `items: [{ medId, qty, price }]`, `totalAmount`, `paymentMethod`, `createdAt`.
*   **Medicine:** `...`, `requiresPrescription` (boolean), `taxRate`.

### Key UI Components
*   **POS Interface:** Split screen – Scanner/Product Lookup on left, Current Bill/Cart on right.
*   **LiveTicker:** Running total of today's sales on the dashboard top bar.
*   **StockHealthWidget:** Visual pie chart of Good vs. Low vs. Expired stock.

---

## 7. Milestones & Roadmap

### Phase 1: Foundation (Weeks 1-4)
*   [ ] Set up Next.js project structure.
*   [ ] Implement Authentication flow.
*   [ ] Build **Inventory Master** (Add/Edit/Delete Medicines).
*   [ ] **Integrate Barcode Scanner** for stock lookup.

### Phase 2: The Logic (Weeks 5-8)
*   [ ] Build **POS / Billing Interface** (Cart logic, Total calculation).
*   [ ] Implement "Scan to Sell" flow (connecting scanner to cart).
*   [ ] Develop Dashboard Widgets (Sales Ticker, Low Stock).

### Phase 3: Polish & Scale (Weeks 9-12)
*   [ ] Vendor & Reorder management.
*   [ ] Reports & Exporting.
*   [ ] UI Polish (Animations, Dark Mode).
*   [ ] Deployment & Testing.

---

## 8. Success Metrics
*   **Checkout Speed:** Average transaction time < 45 seconds.
*   **Inventory Accuracy:** 99% match between digital and physical counts.
*   **Zero Expired Sales:** 0 incidents of expired medicine being sold (system blocked).

Great — I’ll make this **exactly according to your college guidelines (max 15 slides)** and also suitable for speaking in presentation.

Your project:
**Web-based Pharmacy Management System (Inventory + Billing using Barcode Scanner)**

Below are **READY-TO-PUT bullet points per slide** 👇

---

## **SLIDE 1 — Title Slide**

**Pharmacy Management System (Web Application)**

* Mini Project – Web Development
* Department of Computer Engineering
* College Name
* Subject Name
* Guide Name
* Group Members:

  * Name 1
  * Name 2
  * Name 3
  * Name 4

---

## **SLIDE 2 — Introduction**

* Pharmacies handle large numbers of medicines daily
* Manual record keeping leads to errors and delays
* Stock expiry and shortage is difficult to track
* Billing takes time during rush hours
* Need for digital solution for efficiency

**Solution:**
A web-based system to manage inventory and generate bills using barcode scanning

---

## **SLIDE 3 — Aim of the Project**

* To develop an online pharmacy management system
* To automate medicine inventory handling
* To reduce human errors in billing
* To speed up checkout process using barcode scanning
* To maintain accurate digital records

---

## **SLIDE 4 — Objectives**

* Secure login system for pharmacist
* Add, update, delete medicine records
* Automatic stock quantity update
* Fast billing system using barcode
* Store sales history
* Alert for low stock and expiry medicines

---

## **SLIDE 5 — Scope of the Project**

* Designed for small and medium pharmacies
* Works on any browser (no installation required)
* Can be accessed from multiple computers
* Helps in inventory management and sales tracking
* Future scope: online prescription upload & supplier integration

---

## **SLIDE 6 — Literature Review (Existing System)**

**Current System (Manual/Traditional):**

* Registers used for stock entry
* Manual bill calculation
* Hard to find medicine availability
* No expiry tracking
* Billing takes more time

**Examples of Existing Systems:**

* Manual register-based stock and billing system
* Excel or spreadsheet-based medicine records
* Standalone desktop billing software used only at the counter

**Limitations Compared to Our Project:**

* Manual systems are slow and error-prone
* Spreadsheet systems do not provide real-time barcode-based billing
* Many desktop tools focus only on billing, not full inventory tracking
* Expiry and low-stock alerts are limited or missing
* Some solutions are expensive, complex, and require training
* Data is not easily accessible from multiple systems through a browser

---

## **SLIDE 7 — Problem Statement**

Pharmacies face problems like:

* Long billing queues
* Inventory mismatch
* Selling expired medicines accidentally
* Difficulty in tracking stock
* Human calculation errors

**Therefore, a simple and affordable digital system is required.**

---

## **SLIDE 8 — Proposed System**

We propose a web application that:

* Stores medicine database
* Allows login authentication
* Updates stock automatically
* Generates bill using barcode scanner
* Maintains transaction history

---

## **SLIDE 9 — System Architecture / Block Diagram**

(You will draw diagram in PPT)

**Flow:**
User → Login → Dashboard → Inventory Module → Billing Module → Database

Include blocks:

* Frontend (User Interface)
* Backend Server
* Database
* Barcode Scanner Input

---

## **SLIDE 10 — Technologies Used**

**Frontend**

* HTML
* CSS
* JavaScript

**Backend**

* Node.js
* Express.js

**Database**

* MongoDB

**Other Tools**

* Barcode Scanner
* REST APIs

---

## **SLIDE 11 — Hardware & Software Requirements**

**Hardware**

* Computer/Laptop
* Barcode Scanner
* Internet connection

**Software**

* Web Browser
* VS Code
* MongoDB
* Node.js

---

## **SLIDE 12 — Working / Algorithm**

1. User logs into system
2. Dashboard loads medicine data
3. Pharmacist scans barcode
4. System fetches medicine details
5. Adds item to cart
6. Calculates total automatically
7. Generates bill and updates stock

---

## **SLIDE 13 — Implementation (Modules)**

**Modules:**

* Login Module
* Add Medicine Module
* Inventory Management
* Billing Module
* Sales History Module

---

## **SLIDE 14 — Advantages**

* Fast billing process
* Reduces human errors
* Easy stock tracking
* Prevents selling expired medicines
* Saves time and effort
* Affordable solution for pharmacies

---

## **SLIDE 15 — References**

* MDN Web Docs
* MongoDB Documentation
* Node.js Documentation
* Express.js Documentation
* StackOverflow
* Research papers on retail automation
