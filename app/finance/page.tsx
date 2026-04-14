import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import PageContainer from "@/components/PageContainer";
import MainLayout from "@/components/MainLayout";
import { prisma } from "@/lib/prisma";
import { getSignedPdfUrl } from "@/lib/pdf-token";
import { format } from "date-fns";
import { Download, Receipt, Search, Filter } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default async function FinancePage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  // Fetch all bills for this user
  const billsRaw = await prisma.bill.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      items: {
        include: {
          medicine: true,
        },
      },
    },
  });

  // Fetch all batches to calculate internal loss (Expired/Recalled)
  const allBatches = await prisma.batch.findMany({
    where: {
      medicine: { userId }
    }
  });

  const now = new Date();
  
  // 1. Calculate Expired Loss
  const expiredBatches = allBatches.filter(b => b.expiryDate < now && b.quantity > 0 && !b.isRecalled);
  const expiredLoss = expiredBatches.reduce((sum, b) => sum + (b.quantity * b.costPrice), 0);

  // 2. Calculate Recalled Loss (Recalled takes priority over Expired for tracking)
  const recalledBatches = allBatches.filter(b => b.isRecalled && b.quantity > 0);
  const recalledLoss = recalledBatches.reduce((sum, b) => sum + (b.quantity * b.costPrice), 0);

  const totalLoss = expiredLoss + recalledLoss;

  const bills = billsRaw.map(bill => ({
    id: bill.id,
    customerName: bill.customerName,
    customerPhone: bill.customerPhone,
    totalAmount: bill.totalAmount,
    createdAt: bill.createdAt,
    itemsText: bill.items.map(i => `${i.medicine.name} x${i.quantity}`).join(', '),
    pdfUrl: getSignedPdfUrl(bill.id),
  }));

  const totalRevenue = bills.reduce((sum, b) => sum + b.totalAmount, 0);
  const averageOrderValue = bills.length > 0 ? totalRevenue / bills.length : 0;

  return (
    <PageContainer>
      <MainLayout>
        <div className="mb-8 space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-xl">
               <Receipt className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-foreground">Financial Reports</h2>
              <p className="text-muted-foreground">
                Track your sales history, revenue, and customer invoices.
              </p>
            </div>
          </div>
        </div>

        {/* Top Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
            <div className="p-4 sm:p-6 bg-card border border-border rounded-xl shadow-sm">
                <h3 className="text-xs sm:text-sm font-medium text-muted-foreground mb-1">Lifetime Revenue</h3>
                <p className="text-2xl sm:text-3xl font-bold text-primary">₹{totalRevenue.toFixed(2)}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Total across {bills.length} sales</p>
            </div>
            <div className="p-4 sm:p-6 bg-card border border-border rounded-xl shadow-sm">
                <h3 className="text-xs sm:text-sm font-medium text-muted-foreground mb-1">Average Order</h3>
                <p className="text-2xl sm:text-3xl font-bold">₹{averageOrderValue.toFixed(2)}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Per transaction average</p>
            </div>
            <div className="p-4 sm:p-6 bg-card border border-border rounded-xl shadow-sm border-l-4 border-l-orange-500/50">
                <h3 className="text-xs sm:text-sm font-medium text-muted-foreground mb-1">Expired Loss</h3>
                <p className="text-2xl sm:text-3xl font-bold text-orange-600 dark:text-orange-400">₹{expiredLoss.toFixed(2)}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">{expiredBatches.length} dead batches</p>
            </div>
            <div className="p-4 sm:p-6 bg-card border border-border rounded-xl shadow-sm border-l-4 border-l-red-500/50">
                <h3 className="text-xs sm:text-sm font-medium text-muted-foreground mb-1">Recalled Loss</h3>
                <p className="text-2xl sm:text-3xl font-bold text-red-600 dark:text-red-400">₹{recalledLoss.toFixed(2)}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Frozen capital</p>
            </div>
        </div>

        {/* Transaction History */}
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between gap-4 bg-muted/20">
               <h3 className="font-semibold text-lg flex-1">Transaction History</h3>
            </div>
            
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-transparent">
                            <TableHead className="w-[140px] sm:w-[180px]">Date & Time</TableHead>
                            <TableHead>Customer</TableHead>
                            <TableHead className="max-w-[300px] hidden md:table-cell">Items Purchased</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead className="text-right">Bill</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {bills.length > 0 ? (
                            bills.map(bill => (
                                <TableRow key={bill.id} className="cursor-pointer hover:bg-muted/50 transition-colors">
                                    <TableCell className="font-medium">
                                        <div className="flex flex-col">
                                            <span>{format(bill.createdAt, 'MMM d, yyyy')}</span>
                                            <span className="text-xs text-muted-foreground">{format(bill.createdAt, 'h:mm a')}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {bill.customerName ? (
                                            <div className="flex flex-col">
                                                <span className="font-medium text-primary">{bill.customerName}</span>
                                                {bill.customerPhone && <span className="text-xs text-muted-foreground">{bill.customerPhone}</span>}
                                            </div>
                                        ) : (
                                            <span className="text-muted-foreground italic text-sm">Anonymous Walk-in</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="max-w-[300px] hidden md:table-cell">
                                        <p className="truncate text-sm text-muted-foreground" title={bill.itemsText}>
                                            {bill.itemsText}
                                        </p>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <span className="font-bold text-base">₹{bill.totalAmount.toFixed(2)}</span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button asChild variant="outline" size="icon" className="h-9 w-9">
                                            <a href={bill.pdfUrl} target="_blank" rel="noopener noreferrer">
                                                <Download className="h-4 w-4" />
                                            </a>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={5} className="h-48 text-center text-muted-foreground">
                                    <div className="flex flex-col items-center justify-center">
                                        <Receipt className="h-10 w-10 mb-4 opacity-20" />
                                        <p>No transactions found.</p>
                                        <p className="text-sm mt-1">Start billing on the POS to see history here.</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>

      </MainLayout>
    </PageContainer>
  );
}
