"use client"

import PageContainer from "@/components/PageContainer";
import MainLayout from "@/components/MainLayout";
import { DashboardHeader } from "@/components/DashboardHeader";
import WeightedScore from "@/components/dashboard/WeightedScore";
import StockPercentage from "@/components/dashboard/StockPercentage";

interface DashboardProps {
  stats: {
    lowStock: number;
    outOfStock: number;
    arrivingStock: number;
    totalProducts: number;
    stockHealth: number;
  };
}

export default function Dashboard({ stats }: DashboardProps) {
  return (
    <PageContainer>
      <MainLayout>
        <DashboardHeader />
        
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             <WeightedScore 
               lowStock={stats.lowStock} 
               outOfStock={stats.outOfStock} 
               arrivingStock={stats.arrivingStock} 
             />
             <StockPercentage percentage={stats.stockHealth} />
             
             {/* Summary Card */}
             <div className="flex flex-col justify-between p-6 bg-card border border-border rounded-xl shadow-sm">
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Quick Stats</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Total Products</span>
                      <span className="text-2xl font-bold">{stats.totalProducts}</span>
                    </div>
                     <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Low Stock Items</span>
                      <span className="text-2xl font-bold text-orange-500">{stats.lowStock}</span>
                    </div>
                     <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Out of Stock</span>
                      <span className="text-2xl font-bold text-destructive">{stats.outOfStock}</span>
                    </div>
                  </div>
                </div>
             </div>
          </div>
        </div>
      </MainLayout>
    </PageContainer>
  )
}
