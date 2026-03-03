"use client"

import PageContainer from "@/components/PageContainer";
import MainLayout from "@/components/MainLayout";
import { DashboardHeader } from "@/components/DashboardHeader";
import WeightedScore from "@/components/dashboard/WeightedScore";
import StockPercentage from "@/components/dashboard/StockPercentage";

interface DashboardProps {
  stats: {
    inStock: number;
    lowStock: number;
    outOfStock: number;
    totalProducts: number;
    stockHealth: number;
    totalRevenueToday: number;
    totalSalesToday: number;
    expiringBatches: {
      id: string;
      name: string;
      batchNumber: string;
      expiryDate: Date;
      quantity: number;
    }[];
    recentTransactions: {
      id: string;
      amount: number;
      items: number;
      time: Date;
      customerName: string | null;
    }[];
  };
}

import { AreaChart, Banknote, CalendarClock, Activity, AlertTriangle, ArrowUpRight, TrendingUp, Package } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow, format } from "date-fns";

export default function Dashboard({ stats }: DashboardProps) {
  const isHealthyStock = stats.stockHealth > 0.6;

  return (
    <PageContainer>
      <MainLayout>
        <DashboardHeader />
        
        <div className="space-y-6">
          {/* Top Row: Key Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
             {/* Total Revenue */}
             <div className="flex flex-col justify-between p-5 bg-card border border-border rounded-xl shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-muted-foreground">Today's Revenue</h3>
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    <Banknote className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold font-sans tracking-tight">₹{stats.totalRevenueToday.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3 text-green-500" /> Across {stats.totalSalesToday} bills
                  </p>
                </div>
             </div>

             {/* Total Products */}
             <div className="flex flex-col justify-between p-5 bg-card border border-border rounded-xl shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-muted-foreground">Active Catalog</h3>
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <Package className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold font-sans tracking-tight">{stats.totalProducts}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Unique medicines tracked
                  </p>
                </div>
             </div>

             {/* Action Required Watch */}
             <div className="flex flex-col justify-between p-5 bg-card border border-border rounded-xl shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-muted-foreground">Action Required</h3>
                  <div className="p-2 bg-orange-500/10 rounded-lg">
                    <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold font-sans tracking-tight text-orange-500">{stats.lowStock + stats.outOfStock}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats.outOfStock} out of stock, {stats.lowStock} low
                  </p>
                </div>
             </div>

             {/* System Health */}
             <div className="flex flex-col justify-between p-5 bg-card border border-border rounded-xl shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-muted-foreground">Catalog Health</h3>
                  <div className={`p-2 rounded-lg ${isHealthyStock ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                    <Activity className={`h-4 w-4 ${isHealthyStock ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`} />
                  </div>
                </div>
                <div>
                  <div className={`text-2xl font-bold font-sans tracking-tight ${!isHealthyStock ? 'text-red-500' : ''}`}>
                    {Math.round(stats.stockHealth * 100)}%
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Unique active products stocked
                  </p>
                </div>
             </div>
          </div>

          {/* Middle Row: Graphical Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
             <WeightedScore 
               inStock={stats.inStock}
               lowStock={stats.lowStock} 
               outOfStock={stats.outOfStock} 
             />
             <StockPercentage percentage={stats.stockHealth} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4">
              {/* Left Column: Alerts & Expiring Soon */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                    <div className="border-b border-border/50 px-6 py-4 flex items-center justify-between bg-muted/20">
                        <div className="flex items-center gap-2">
                            <CalendarClock className="h-5 w-5 text-destructive" />
                            <h3 className="font-semibold text-foreground">Critical Expiry Watchlist</h3>
                        </div>
                        <span className="text-xs font-medium px-2.5 py-1 bg-destructive/10 text-destructive rounded-full">
                            {stats.expiringBatches.length} items within 30 days
                        </span>
                    </div>
                    <div className="p-0">
                        {stats.expiringBatches.length > 0 ? (
                            <div className="divide-y divide-border/50">
                                {stats.expiringBatches.map(batch => {
                                    const isExpired = new Date(batch.expiryDate) < new Date();
                                    return (
                                        <div key={batch.id} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                                            <div>
                                                <p className="font-medium text-sm flex items-center gap-2">
                                                    {batch.name}
                                                    {isExpired && <span className="text-[9px] font-bold bg-destructive/20 text-destructive px-1.5 py-0.5 rounded uppercase tracking-wider">Expired</span>}
                                                </p>
                                                <p className="text-xs text-muted-foreground mt-0.5">Batch: {batch.batchNumber} • Stock: {batch.quantity}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className={`text-sm font-medium ${isExpired ? 'text-destructive' : 'text-orange-500'}`}>
                                                    {format(new Date(batch.expiryDate), 'MMM d, yyyy')}
                                                </p>
                                                <p className="text-xs text-muted-foreground mt-0.5 whitespace-nowrap">
                                                    {isExpired ? 'Past due' : `in ${formatDistanceToNow(new Date(batch.expiryDate))}`}
                                                </p>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        ) : (
                            <div className="p-8 text-center text-muted-foreground flex flex-col items-center">
                                <span className="text-4xl mb-3">✨</span>
                                <p className="text-sm">No medicines are expiring soon.</p>
                                <p className="text-xs mt-1">Your inventory is safe!</p>
                            </div>
                        )}
                    </div>
                </div>
              </div>

              {/* Right Column: Recent Sales Activity */}
              <div className="space-y-6">
                <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col h-full">
                    <div className="border-b border-border/50 px-6 py-4 flex items-center justify-between">
                        <h3 className="font-semibold text-foreground flex items-center gap-2">
                           <AreaChart className="h-4 w-4 text-primary" /> Recent Sales
                        </h3>
                    </div>
                    <div className="p-0 flex-1">
                        {stats.recentTransactions.length > 0 ? (
                            <div className="divide-y divide-border/50">
                                {stats.recentTransactions.map(tx => (
                                    <div key={tx.id} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                                        <div>
                                            <p className="font-medium text-sm flex items-center gap-2">
                                                ₹{tx.amount.toFixed(2)}
                                                {tx.customerName && (
                                                    <span className="text-[10px] font-medium px-1.5 py-0.5 bg-primary/10 text-primary rounded-md truncate max-w-[100px]">
                                                        {tx.customerName}
                                                    </span>
                                                )}
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-0.5">{tx.items} {tx.items === 1 ? 'item' : 'items'} sold</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs font-medium text-muted-foreground mb-1">
                                                {formatDistanceToNow(new Date(tx.time), { addSuffix: true })}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-8 text-center text-muted-foreground">
                                <p className="text-sm">No sales today yet.</p>
                            </div>
                        )}
                    </div>
                    <div className="p-4 border-t border-border/50 bg-muted/10">
                        <Link href="/billing" className="flex justify-center items-center w-full py-2 text-sm font-medium text-primary hover:bg-primary/10 rounded-md transition-colors group">
                            Open Billing Terminal <ArrowUpRight className="ml-1 h-3 w-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                        </Link>
                    </div>
                </div>
              </div>
          </div>
        </div>
      </MainLayout>
    </PageContainer>
  )
}
