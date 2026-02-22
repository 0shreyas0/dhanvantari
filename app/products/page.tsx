import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import PageContainer from "@/components/PageContainer";
import MainLayout from "@/components/MainLayout";
import InventoryTable from "@/components/InventoryTable";
import { redirect } from "next/navigation";
import { AddProductDialog } from "@/components/AddProductDialog";

export default async function ProductsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const medicines = await prisma.medicine.findMany({
    where: { userId },
    include: {
      batches: true,
    }
  });

  const data = medicines.map(med => {
    const stock = med.batches.reduce((sum, b) => sum + b.quantity, 0);
    // Find representative price (first batch or average?) - use first batch for now
    // If no batches, price is 0
    const price = med.batches.length > 0 ? med.batches[0].sellingPrice : 0; 
    const batches = med.batches.map(b => b.batchNumber).join(", ");
    
    return {
      id: med.id,
      name: med.name,
      barcode: med.barcode,
      batch: batches || "N/A",
      stock,
      price,
      status: stock === 0 ? "Out of Stock" : stock < med.lowStockThreshold ? "Low Stock" : "In Stock"
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
        <InventoryTable data={data} />
      </MainLayout>
    </PageContainer>
  );
}
