"use client"

import { useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { PrintBarcodeButton } from "@/components/PrintBarcodeButton"
import { toggleRecallBatch, exportInventoryToCSV, importInventoryFromCSV } from "@/actions/inventory"
import { useRouter } from "next/navigation"
import { Download, FileUp, Loader2, Search, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { ExpiryBadge } from "@/components/ExpiryBadge"
import { ExpirySettings, DEFAULT_EXPIRY_SETTINGS } from "@/lib/expiry"

interface Product {
  id: string
  name: string
  barcode: string
  batch: string
  stock: number
  price: number
  status: string
  expiryDate?: string | null   // ISO string of earliest batch expiry
  rawBatches?: any[]
}

interface InventoryTableProps {
  data: Product[]
  pharmacyName: string
  expirySettings?: ExpirySettings
}

export default function InventoryTable({
  data,
  pharmacyName,
  expirySettings = DEFAULT_EXPIRY_SETTINGS,
}: InventoryTableProps) {
    const [searchQuery, setSearchQuery] = useState("")
    const [statusFilter, setStatusFilter] = useState("all")
    const router = useRouter()
    
    const [isExporting, setIsExporting] = useState(false)
    const [isImporting, setIsImporting] = useState(false)
    
    const handleToggleRecall = async (batchId: string) => {
        if (!confirm("Are you sure you want to toggle the recall status for this batch? This will freeze its sales availability.")) {
            return;
        }
        await toggleRecallBatch(batchId);
        router.refresh();
    }

    const handleExport = async () => {
        setIsExporting(true)
        try {
            const data = await exportInventoryToCSV()
            if (data.length === 0) {
                toast.error("No data to export")
                return
            }

            const headers = Object.keys(data[0])
            const csvRows = [
                headers.join(","),
                ...data.map(row => headers.map(fieldName => JSON.stringify(row[fieldName as keyof typeof row] || "")).join(","))
            ]
            const csvContent = csvRows.join("\n")
            
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
            const url = URL.createObjectURL(blob)
            const link = document.createElement("a")
            link.setAttribute("href", url)
            link.setAttribute("download", `Dhanvantari_Inventory_${new Date().toLocaleDateString()}.csv`)
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            toast.success("Inventory exported successfully!")
        } catch (e) {
            console.error(e)
            toast.error("Failed to export inventory")
        } finally {
            setIsExporting(false)
        }
    }

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setIsImporting(true)
        const reader = new FileReader()
        
        reader.onload = async (event) => {
            try {
                const text = event.target?.result as string
                const lines = text.split("\n")
                const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ''))
                
                const rows = lines.slice(1).filter(l => l.trim()).map(line => {
                    const values = line.split(",").map(v => v.trim().replace(/^"|"$/g, ''))
                    const obj: any = {}
                    headers.forEach((h, i) => {
                        obj[h] = values[i]
                    })
                    return obj
                })

                if (rows.length === 0) {
                    toast.error("CSV file is empty")
                    return
                }

                const result = await importInventoryFromCSV(rows)
                if (result.success) {
                    toast.success(`Imported ${result.successCount} items! (${result.errorCount} skipped)`)
                    router.refresh()
                } else {
                    toast.error("Failed to import data")
                }
            } catch (e) {
                console.error(e)
                toast.error("Invalid CSV format")
            } finally {
                setIsImporting(false)
                e.target.value = ""
            }
        }
        reader.readAsText(file)
    }

    const filteredData = data.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            product.barcode.includes(searchQuery)
      const matchesStatus = statusFilter === "all" || product.status === statusFilter
      
      return matchesSearch && matchesStatus
    })

    return (
      <Card className="border-border/40 shadow-sm">
        <CardHeader className="border-b border-border/40 px-6 py-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-medium">Inventory List</CardTitle>
            <div className="flex items-center gap-3">
                <div className="flex gap-1">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-9 gap-2" 
                        onClick={handleExport}
                        disabled={isExporting}
                    >
                        {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                        Export
                    </Button>
                    <div className="relative">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-9 gap-2" 
                            disabled={isImporting}
                            onClick={() => document.getElementById('csv-upload')?.click()}
                        >
                            {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
                            Import
                        </Button>
                        <input 
                            id="csv-upload" 
                            type="file" 
                            className="hidden" 
                            accept=".csv" 
                            onChange={handleImport} 
                        />
                    </div>
                </div>
                <div className="h-6 w-px bg-border mx-1" />
                <div className="relative w-64">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Search products..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8 h-9"
                    />
                </div>
                <div className="relative">
                    <select 
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="h-9 w-[150px] rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                        <option value="all">All Status</option>
                        <option value="In Stock">In Stock</option>
                        <option value="Low Stock">Low Stock</option>
                        <option value="Out of Stock">Out of Stock</option>
                        <option value="Recalled">Recalled</option>
                    </select>
                </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[220px]">Medicine Name</TableHead>
                <TableHead>Barcode</TableHead>
                <TableHead>Batch No</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.length > 0 ? (
                filteredData.map((med) => (
                    <TableRow key={med.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="font-medium">{med.name}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                        <div className="flex items-center gap-1">
                            {med.barcode}
                            <div className="ml-2 flex items-center">
                                <PrintBarcodeButton 
                                  pharmacyName={pharmacyName}
                                  medicineName={med.name} 
                                  barcode={med.barcode} 
                                  price={med.price} 
                                  batch={med.batch} 
                                />
                                {med.rawBatches && med.rawBatches.length > 0 && (
                                  <button 
                                      onClick={() => handleToggleRecall(med.rawBatches![0].id)}
                                      className={`ml-1 p-1 rounded hover:bg-muted ${med.status === 'Recalled' ? 'text-red-500' : 'text-muted-foreground'}`}
                                      title={med.status === 'Recalled' ? 'Un-Recall First Batch' : 'Recall First Batch'}
                                  >
                                      <AlertTriangle className="h-4 w-4" />
                                  </button>
                                )}
                            </div>
                        </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{med.batch}</TableCell>
                    <TableCell>{med.stock}</TableCell>
                    <TableCell>₹{med.price.toFixed(2)}</TableCell>
                    <TableCell>
                        {med.expiryDate ? (
                          <ExpiryBadge
                            expiryDate={med.expiryDate}
                            settings={expirySettings}
                          />
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                    </TableCell>
                    <TableCell>
                        <Badge 
                        variant="outline" 
                        className={`
                            ${med.status === 'Recalled' ? 'bg-red-500/20 text-red-700 border-red-500 dark:text-red-400 font-bold' :
                            med.status === 'Out of Stock' ? 'bg-destructive/10 text-destructive border-destructive/20' : 
                            med.status === 'Low Stock' ? 'bg-orange-500/10 text-orange-600 border-orange-200 dark:text-orange-400 dark:border-orange-500/20' : 
                            'bg-green-500/10 text-green-600 border-green-200 dark:text-green-400 dark:border-green-500/20'}
                        `}
                        >
                        {med.status}
                        </Badge>
                    </TableCell>
                    </TableRow>
                ))
              ) : (
                  <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                          No products found.
                      </TableCell>
                  </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  }
