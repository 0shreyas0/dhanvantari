"use client"

import { useState, Fragment } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { PrintBarcodeButton } from "@/components/PrintBarcodeButton"
import { toggleRecallBatch, exportInventoryToCSV, importInventoryFromCSV } from "@/actions/inventory"
import { useRouter } from "next/navigation"
import {
  Download,
  FileUp,
  Loader2,
  Search,
  AlertTriangle,
  ChevronRight,
  ChevronDown,
  Layers,
  Table as TableIcon,
  Globe,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { ExpiryBadge } from "@/components/ExpiryBadge"
import { ExpirySettings, DEFAULT_EXPIRY_SETTINGS } from "@/lib/expiry"
import { AddBatchDialog } from "@/components/AddBatchDialog"
import { DeleteMedicineDialog } from "@/components/DeleteMedicineDialog"

// ─── Types ────────────────────────────────────────────────────────────────────

interface Batch {
  id: string
  barcode: string
  batchNumber: string
  quantity: number
  costPrice: number
  sellingPrice: number
  expiryDate: string   // ISO string
  isRecalled: boolean
}

interface Product {
  id: string
  name: string
  barcodes: string // Concatenated for search
  category?: string | null
  description?: string | null
  totalStock: number
  price: number
  status: string
  recalledCount?: number
  expiryDate?: string | null
  batches: Batch[]
}

interface InventoryTableProps {
  data: Product[]
  pharmacyName: string
  expirySettings?: ExpirySettings
}

// ─── Status badge helper ───────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "Recalled"
      ? "bg-red-500/20 text-red-700 border-red-500 dark:text-red-400 font-bold"
      : status === "Out of Stock"
      ? "bg-destructive/10 text-destructive border-destructive/20"
      : status === "Low Stock"
      ? "bg-orange-500/10 text-orange-600 border-orange-200 dark:text-orange-400 dark:border-orange-500/20"
      : "bg-green-500/10 text-green-600 border-green-200 dark:text-green-400 dark:border-green-500/20"
  return (
    <Badge variant="outline" className={cls}>
      {status}
    </Badge>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function InventoryTable({
  data,
  pharmacyName,
  expirySettings = DEFAULT_EXPIRY_SETTINGS,
}: InventoryTableProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [isGSheetModalOpen, setIsGSheetModalOpen] = useState(false)
  const [gsheetUrl, setGsheetUrl] = useState("")
  const [isGSheetLoading, setIsGSheetLoading] = useState(false)
  const router = useRouter()

  const handleGSheetImport = async () => {
    if (!gsheetUrl.includes("docs.google.com/spreadsheets")) {
      toast.error("Please enter a valid Google Sheets URL")
      return
    }

    setIsGSheetLoading(true)
    try {
      // Convert standard URL to CSV export URL
      // Pattern: /d/ID/edit... -> /d/ID/export?format=csv
      let exportUrl = gsheetUrl
      if (gsheetUrl.includes("/edit")) {
        exportUrl = gsheetUrl.split("/edit")[0] + "/export?format=csv"
      } else if (!gsheetUrl.includes("/export")) {
        exportUrl = gsheetUrl.replace(/\/$/, "") + "/export?format=csv"
      }

      const response = await fetch(exportUrl)
      if (!response.ok) throw new Error("Failed to fetch sheet. Ensure it is shared as 'Anyone with the link can view'.")
      
      const csvText = await response.text()
      const lines = csvText.split(/\r?\n/).filter(line => line.trim())
      
      // Find the header row (the first row containing "Medicine Name")
      let headerIndex = lines.findIndex(line => line.toLowerCase().includes("medicine name"))
      if (headerIndex === -1) headerIndex = 0 // Fallback to first line

      const headerLine = lines[headerIndex]
      const headers = headerLine.split(",").map(h => h.trim().replace(/^"|"$/g, ""))
      
      const parsedRows = lines.slice(headerIndex + 1).map(line => {
        // Robust CSV split for commas, handling quotes correctly
        const values: string[] = []
        let current = ""
        let inQuotes = false
        for (let i = 0; i < line.length; i++) {
            const char = line[i]
            if (char === '"') inQuotes = !inQuotes
            else if (char === ',' && !inQuotes) {
                values.push(current)
                current = ""
            } else {
                current += char
            }
        }
        values.push(current)

        const row: any = {}
        headers.forEach((h, i) => { 
            row[h] = (values[i] || "").trim().replace(/^"|"$/g, "") 
        })
        return row
      })

      const result = await importInventoryFromCSV(parsedRows)
      if (result.success) {
        toast.success(`Imported ${result.successCount} items from Google Sheets!`)
        setIsGSheetModalOpen(false)
        setGsheetUrl("")
        router.refresh()
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to import from Google Sheets. Is the sheet public?")
    } finally {
      setIsGSheetLoading(false)
    }
  }

  const toggleExpand = (id: string) =>
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const handleToggleRecall = async (batchId: string) => {
    if (!confirm("Toggle recall status for this batch? Recalled batches cannot be sold.")) return
    await toggleRecallBatch(batchId)
    router.refresh()
  }

  const handleExport = async (mode: 'download' | 'copy' = 'download') => {
    setIsExporting(true)
    try {
      const rows = await exportInventoryToCSV()
      if (rows.length === 0) { toast.error("No data to export"); return }
      const headers = Object.keys(rows[0])
      const csv = [
        headers.join(","),
        ...rows.map(row =>
          headers.map(h => JSON.stringify((row as any)[h] || "")).join(",")
        ),
      ].join("\n")

      if (mode === 'download') {
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `Dhanvantari_Inventory_${new Date().toLocaleDateString()}.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        toast.success("Inventory exported successfully!")
      } else {
        // Copy to clipboard
        await navigator.clipboard.writeText(csv)
        toast.success("Inventory CSV copied to clipboard!")
      }
    } catch {
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
    reader.onload = async event => {
      try {
        const text = event.target?.result as string
        const lines = text.split(/\r?\n/).filter(l => l.trim())
        
        // Find header row
        let headerIndex = lines.findIndex(line => line.toLowerCase().includes("medicine name"))
        if (headerIndex === -1) headerIndex = 0

        const headerLine = lines[headerIndex]
        const headers = headerLine.split(",").map(h => h.trim().replace(/^"|"$/g, ""))
        
        const rows = lines.slice(headerIndex + 1).map(line => {
            const values: string[] = []
            let current = ""
            let inQuotes = false
            for (let i = 0; i < line.length; i++) {
                const char = line[i]
                if (char === '"') inQuotes = !inQuotes
                else if (char === ',' && !inQuotes) {
                    values.push(current)
                    current = ""
                } else {
                    current += char
                }
            }
            values.push(current)

            const obj: any = {}
            headers.forEach((h, i) => { 
                obj[h] = (values[i] || "").trim().replace(/^"|"$/g, "") 
            })
            return obj
        })
        if (rows.length === 0) { toast.error("CSV file is empty"); return }
        const result = await importInventoryFromCSV(rows)
        if (result.success) {
          toast.success(`Imported ${result.successCount} items! (${result.errorCount} skipped)`)
          router.refresh()
        } else {
          toast.error("Failed to import data")
        }
      } catch {
        toast.error("Invalid CSV format")
      } finally {
        setIsImporting(false)
        e.target.value = ""
      }
    }
    reader.readAsText(file)
  }

  const filteredData = data.filter(p => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.barcodes && p.barcodes.includes(searchQuery))
    const matchesStatus = statusFilter === "all" || p.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <Card className="border-border/40 shadow-sm">
      {/* ── Header ── */}
      <CardHeader className="border-b border-border/40 px-6 py-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-medium">Inventory List</CardTitle>
          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              {/* Export Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 gap-2" disabled={isExporting}>
                    {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    Export
                    <ChevronDown className="h-3 w-3 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Export Options</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleExport('download')} className="gap-2">
                    <TableIcon className="h-4 w-4 text-muted-foreground" />
                    Download as .CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('copy')} className="gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    Copy to Clipboard (CSV)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Import Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 gap-2" disabled={isImporting}>
                    {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
                    Import
                    <ChevronDown className="h-3 w-3 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Import Source</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => document.getElementById("csv-upload")?.click()} className="gap-2">
                    <TableIcon className="h-4 w-4 text-muted-foreground" />
                    Local .CSV File
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsGSheetModalOpen(true)} className="gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    Google Sheets Link
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <input id="csv-upload" type="file" className="hidden" accept=".csv" onChange={handleImport} />
            </div>
            <div className="h-6 w-px bg-border mx-1" />
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products/barcodes..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-8 h-9"
              />
            </div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
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
      </CardHeader>

      {/* ── Table ── */}
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-12 text-center text-[10px] font-bold px-0">#</TableHead>
              <TableHead className="w-[180px]">Medicine Name</TableHead>
              <TableHead className="w-[120px]">Category</TableHead>
              <TableHead className="w-[200px]">Batches / Barcode</TableHead>
              <TableHead className="w-[90px]">Stock</TableHead>
              <TableHead className="w-[110px]">Price (FEFO)</TableHead>
              <TableHead className="w-[160px]">Nearest Expiry</TableHead>
              <TableHead className="w-[140px]">Status</TableHead>
              <TableHead className="w-[80px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.length > 0 ? (
              filteredData.map(med => {
                const isOpen = expanded.has(med.id)
                return (
                  <Fragment key={med.id}>
                    {/* ── Medicine summary row ── */}
                    <TableRow
                      className="hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => toggleExpand(med.id)}
                    >
                      <TableCell className="text-center px-0">
                        <button className="p-1 rounded hover:bg-muted transition-colors">
                          {isOpen
                            ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            : <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          }
                        </button>
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="relative group inline-flex flex-col gap-0.5">
                          <span className={med.description ? "cursor-default underline decoration-dotted decoration-muted-foreground/40 underline-offset-2" : ""}>
                            {med.name}
                          </span>
                          {med.description && (
                            <div className="pointer-events-none absolute bottom-full left-0 mb-2 z-50 max-w-[240px] rounded-md border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                              {med.description}
                              <span className="absolute top-full left-4 border-4 border-transparent border-t-border" />
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {med.category && (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full border border-border/50">
                            {med.category}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Layers className="h-3.5 w-3.5" />
                          <span className="text-sm">{med.batches.length} batch{med.batches.length !== 1 ? "es" : ""}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-lg leading-none">{med.totalStock}</TableCell>
                      <TableCell className="font-medium">₹{med.price.toFixed(2)}</TableCell>
                      <TableCell>
                        {med.expiryDate
                          ? <ExpiryBadge expiryDate={med.expiryDate} settings={expirySettings} />
                          : <span className="text-xs text-muted-foreground">—</span>
                        }
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <StatusBadge status={med.status} />
                          {(med.recalledCount ?? 0) > 0 && med.status !== "Recalled" && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-orange-600 dark:text-orange-400 bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 px-1.5 py-0.5 rounded-full">
                              <AlertTriangle className="h-3 w-3" />
                              {med.recalledCount} recalled
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <AddBatchDialog medicineId={med.id} medicineName={med.name} />
                          <DeleteMedicineDialog
                            medicineId={med.id}
                            medicineName={med.name}
                            batchCount={med.batches.length}
                          />
                        </div>
                      </TableCell>
                    </TableRow>

                    {/* ── Per-batch sub-rows ── */}
                    {isOpen && med.batches.map((batch, idx) => {
                      const isExpired = new Date(batch.expiryDate) < new Date()
                      const batchStatus = batch.isRecalled ? "Recalled" : isExpired ? "Expired" : batch.quantity === 0 ? "Out of Stock" : "In Stock"

                      return (
                        <TableRow
                          key={batch.id}
                          className="bg-muted/30 hover:bg-muted/50 transition-colors border-l-2 border-primary/30"
                          onClick={e => e.stopPropagation()}
                        >
                          <TableCell className="text-center px-0 opacity-40">
                             <span className="text-[11px] font-mono font-bold">
                                {(idx + 1).toString().padStart(2, '0')}
                             </span>
                          </TableCell>
                          <TableCell className="text-xs font-mono font-bold text-foreground">
                             {batch.batchNumber}
                          </TableCell>
                          <TableCell />
                          <TableCell className="font-mono text-xs">
                             <div className="flex items-center gap-2">
                                <span className="text-foreground">{batch.barcode}</span>
                                    <PrintBarcodeButton
                                        pharmacyName={pharmacyName}
                                        medicineName={med.name}
                                        barcode={batch.barcode}
                                        price={batch.sellingPrice}
                                        batch={batch.batchNumber}
                                    />
                                </div>
                          </TableCell>
                          <TableCell className="font-medium text-xs text-muted-foreground">
                             <span className="font-mono">{batch.quantity}</span>
                          </TableCell>
                          <TableCell className="text-sm font-semibold">₹{batch.sellingPrice.toFixed(2)}</TableCell>
                          <TableCell>
                            <ExpiryBadge expiryDate={batch.expiryDate} settings={expirySettings} />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <StatusBadge status={batchStatus} />
                              <AddBatchDialog
                                medicineId={med.id}
                                medicineName={med.name}
                                editBatchId={batch.id}
                                initialData={{
                                  barcode: batch.barcode,
                                  batchNumber: batch.batchNumber,
                                  quantity: batch.quantity,
                                  costPrice: batch.costPrice,
                                  sellingPrice: batch.sellingPrice,
                                  expiryDate: new Date(batch.expiryDate).toISOString().split('T')[0]
                                }}
                              />
                              <button
                                onClick={() => handleToggleRecall(batch.id)}
                                className={`p-1 rounded hover:bg-muted ${batch.isRecalled ? "text-red-500" : "text-muted-foreground/40 hover:text-muted-foreground"}`}
                                title={batch.isRecalled ? "Un-recall" : "Recall"}
                              >
                                <AlertTriangle className="h-4 w-4" />
                              </button>
                            </div>
                          </TableCell>
                          <TableCell />
                        </TableRow>
                      )
                    })}
                  </Fragment>
                )
              })
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  No products found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={isGSheetModalOpen} onOpenChange={setIsGSheetModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Import from Google Sheets</DialogTitle>
            <DialogDescription>
              Paste the public link to your Google Sheet. Ensure the sheet is shared as 
              <strong> "Anyone with the link can view"</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="gsheet-url" className="text-sm font-medium">Sheet URL</label>
              <Input
                id="gsheet-url"
                placeholder="https://docs.google.com/spreadsheets/d/.../edit"
                value={gsheetUrl}
                onChange={(e) => setGsheetUrl(e.target.value)}
                autoFocus
              />
            </div>
            <div className="text-[11px] text-muted-foreground bg-muted/50 p-2 rounded border border-border/50">
              <p className="font-bold mb-1">💡 Pro-tip:</p>
              The first row of your sheet must contain headers like "Medicine Name", "Stock", "Selling Price", etc., to match our system.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsGSheetModalOpen(false)}>Cancel</Button>
            <Button onClick={handleGSheetImport} disabled={isGSheetLoading || !gsheetUrl}>
              {isGSheetLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Globe className="h-4 w-4 mr-2" />}
              Start Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

