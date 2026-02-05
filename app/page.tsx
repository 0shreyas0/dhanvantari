"use client"

import PageContainer from "@/components/PageContainer";
import MainLayout from "@/components/MainLayout";
import { DashboardHeader } from "@/components/DashboardHeader";
import ActionButtons from "@/components/ActionButtons";
import InventoryTable from "@/components/InventoryTable";

export default function DashboardPage() {
  return (
    <PageContainer>
      <MainLayout>
        <DashboardHeader />
        
        <div className="space-y-6">
          <ActionButtons />
          <InventoryTable />
        </div>
      </MainLayout>
    </PageContainer>
  )
}
