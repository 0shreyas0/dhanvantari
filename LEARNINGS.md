# Learnings from Medicotary

Based on the analysis of the [Medicotary](https://github.com/medicotary/Medicotary) repository and its Figma design structure, here are the key features, design patterns, and architectural decisions we can adopt for our Pharmacy Inventory System.

## 1. Core Feature Set
The application goes beyond simple listing and includes critical business logic for pharmacies:

### Inventory Management
*   **Granular Stock Tracking**:
    *   **Low Stock Alerts**: Validates stock levels against a threshold.
    *   **Out of Stock**: Dedicated view/card for critical items.
    *   **Arriving Stock**: Tracking orders that have been placed but not received.
*   **Rich Product Data**:
    *   **Visual Identification**: Small thumbnail images for medicines in the table (helps quick identification).
    *   **Dual Pricing**: Tracks both `Cost Price` (for profit calc) and `Selling Price` (for billing).
    *   **Vendor Managment**: Links each product to a `Preferred Vendor`, facilitating auto-ordering.

### Dashboard Analytics
*   **Weighted Score**: A likely metric for overall inventory health.
*   **Stock Percentage**: Visual gauge of how "full" the inventory is.
*   **Quick Stats**: Immediate view of critical numbers (Low Stock count, Out of Stock count).

## 2. UI/UX Patterns
The design uses a clean, data-dense interface suitable for back-office operations.

### Layout
*   **Sidebar Navigation**: Persistent left sidebar for switching context (Dashboard, Billings, Products, Vendors).
*   **Top Bar**: Global search and user profile management.
*   **Card-Based Dashboard**: Key metrics are grouped into white cards with soft shadows (`shadow-sm`) on a light gray background (`bg-gray-50`).

### Data Tables (The "ProductTile")
*   **Search & Filter**:
    *   Prominent search bar at the top left of the table view.
    *   "Add Product" button positioned as the primary Call-to-Action (Top Right).
*   **Column Structure**:
    *   **Medicine**: Combined column with Image + Name + Short Note (Truncated).
    *   **Stock**: Bold numbers for easy scanning.
    *   **Price**: Clear currency formatting.
    *   **Vendor**: Direct link to source.

## 3. Technology & Architecture Notes
*   **State Management**: They used Redux/Redux-Saga. For our Next.js app, we can achieve this simpler using **Server Components** for fetching and **React Context/Zustand** for local interactions.
*   **Styling**: They used standard Tailwind utility classes (`bg-indigo-600`, `text-gray-500`, `rounded-lg`). Our use of **Shadcn UI** will naturally give us a more modern version of this same clean aesthetic.

## 4. Actionable Improvements for Our App
1.  **Enhance Inventory Table**: Add an "Image" column and split "Price" into "Cost" vs "Selling".
2.  **Add Dashboard Metrics**: creating a "Low Stock" alert section in our Dashboard is a priority.
3.  **Vendor Field**: Add a column/field for who supplies the medicine.
4.  **Medicine Notes**: A small subtitle below the medicine name for dosage (e.g., "500mg - Tablet") is very useful.
