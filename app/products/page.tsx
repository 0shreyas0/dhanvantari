import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import PageContainer from "@/components/PageContainer";
import MainLayout from "@/components/MainLayout";
import InventoryTable from "@/components/InventoryTable";
import { redirect } from "next/navigation";
import { AddProductDialog } from "@/components/AddProductDialog";
import { getPharmacySettings } from "@/actions/settings";

export default async function ProductsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const medicines = await prisma.medicine.findMany({
    where: { userId },
    include: {
      batches: true,
    }
  });

  const settings = await getPharmacySettings();
  const pharmacyName = settings?.name || "Pharmacy";

  const data = medicines.map(med => {
    const activeBatches = med.batches.filter(b => !b.isRecalled);
    const recalledBatches = med.batches.filter(b => b.isRecalled);
    
    // Total stock from non-recalled items basically, or just show all but flag it.
    const stock = med.batches.reduce((sum, b) => sum + b.quantity, 0);
    const price = med.batches.length > 0 ? med.batches[0].sellingPrice : 0; 

    // Find if the entire medicine line is compromised by a recall
    const hasRecall = recalledBatches.length > 0;
    
    // Which batches to show in the pill
    const batches = med.batches.map(b => b.batchNumber).join(", ");
    
    let status = "In Stock";
    if (hasRecall) {
        status = "Recalled";
    } else if (stock === 0) {
        status = "Out of Stock";
    } else if (stock < med.lowStockThreshold) {
        status = "Low Stock";
    }
    
    return {
      id: med.id,
      name: med.name,
      barcode: med.barcode,
      batch: batches || "N/A",
      stock,
      price,
      status,
      // Pass the first batch ID randomly or just have a detail view...
      // For simplicity let's pass the raw batches so InventoryTable can use them.
      rawBatches: med.batches
    };
  });

  return (
    <PageContainer>
      <MainLayout>
        <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Products</h1>
              <p className="text-muted-foreground mt-2">Manage your inventory.</p>
            </div>
            <AddProductDialog />
        </div>
        <InventoryTable data={data} pharmacyName={pharmacyName} />
      </MainLayout>
    </PageContainer>
  );
}
