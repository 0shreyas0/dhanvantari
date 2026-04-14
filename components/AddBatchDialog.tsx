"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PackagePlus } from "lucide-react"
import { toast } from "sonner"
import { addBatchToMedicine, getAutoBatchDetails } from "@/actions/inventory"
import { useRouter } from "next/navigation"


interface AddBatchDialogProps {
  medicineId: string
  medicineName: string
}

const EMPTY_FORM = {
  barcode: "",
  batchNumber: "",
  quantity: 1,
  costPrice: 0,
  sellingPrice: 0,
  expiryDate: "",
}

export function AddBatchDialog({ medicineId, medicineName }: AddBatchDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const router = useRouter()

  // ── Auto-fill next batch details ───────────────────────────────────────────
  useEffect(() => {
    if (open && !form.batchNumber) {
      getAutoBatchDetails(medicineId).then(details => {
        setForm(prev => ({
          ...prev,
          batchNumber: details.batchNumber,
          barcode: details.barcode,
        }))
      })
    }
  }, [open, medicineId, form.batchNumber])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.batchNumber.trim()) { toast.error("Batch number is required"); return }
    if (!form.expiryDate) { toast.error("Expiry date is required"); return }
    if (Number(form.quantity) < 1) { toast.error("Quantity must be at least 1"); return }

    setLoading(true)
    try {
      await addBatchToMedicine(medicineId, {
        barcode: form.barcode.trim() || undefined,
        batchNumber: form.batchNumber.trim(),
        quantity: Number(form.quantity),
        costPrice: Number(form.costPrice),
        sellingPrice: Number(form.sellingPrice),
        expiryDate: new Date(form.expiryDate),
      })
      setOpen(false)
      setForm(EMPTY_FORM)
      router.refresh()
      toast.success(`Batch added to ${medicineName}!`)
    } catch (err) {
      console.error(err)
      toast.error("Failed to add batch.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
          onClick={e => e.stopPropagation()}
          title="Add batch"
        >
          <PackagePlus className="h-4 w-4" />
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto bg-background text-foreground">
        <DialogHeader>
          <DialogTitle>Add Stock Batch</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-6 py-4">
          <div className="relative bg-muted/10 border border-border/50 rounded-xl p-4 overflow-visible">

            {/* Left semicircle — punches out the border */}
            <div
              className="absolute bg-background rounded-full z-10 border border-border/50"
              style={{
                width: 18,
                height: 18,
                left: -10, // Shifted 1px further out to ensure overlap
                top: 48,
                transform: 'translateY(-50%)',
                clipPath: 'inset(0 0 0 48%)', // Overlap the edge slightly to mask the line
              }}
            />

            {/* Right semicircle — punches out the border */}
            <div
              className="absolute bg-background rounded-full z-10 border border-border/50"
              style={{
                width: 18,
                height: 18,
                right: -10, // Shifted 1px further out to ensure overlap
                top: 48,
                transform: 'translateY(-50%)',
                clipPath: 'inset(0 48% 0 0)', // Overlap the edge slightly to mask the line
              }}
            />

            <div
              className="flex items-center justify-between mb-4 pb-3 relative"
              style={{ paddingBottom: '0.75rem' }}
            >
              <div className="flex items-center gap-2">
                <div className="h-4 w-1 bg-slate-500 rounded-full" />
                <Label className="text-[11px] uppercase tracking-[0.15em] text-slate-400 font-bold">
                  Registration Identification
                </Label>
              </div>
              <span className="text-[9px] font-black tracking-tighter text-slate-300 bg-slate-800 px-2 py-1 rounded-[4px] border border-slate-700 shadow-sm leading-none">
                AUTO
              </span>

              {/* Dashed divider — left/right: 2 keeps dashes from overlapping the circles */}
              <div
                className="absolute border-b border-dashed border-border/60"
                style={{
                  bottom: 0,
                  left: 2,
                  right: 2,
                }}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5 px-1">
                <Label htmlFor="barcode" className="text-xs font-semibold px-1"><p className="text-slate-400">Batch Barcode</p></Label>
                <Input
                  id="barcode" name="barcode"
                  value={form.barcode}
                  onChange={handleChange}
                  placeholder="Generating..."
                  className="font-mono text-xs tracking-[0.1em] h-11 bg-slate-900/80 border-slate-700/50 text-slate-200 font-bold text-center focus-visible:ring-1 focus-visible:ring-primary/30"
                  tabIndex={-1}
                  onFocus={(e) => e.currentTarget.select()}
                />
              </div>

              <div className="grid gap-1.5 px-1">
                <Label htmlFor="batchNumber" className="text-xs font-semibold px-1"><p className="text-slate-400">Batch Number</p></Label>
                <Input
                  id="batchNumber" name="batchNumber"
                  value={form.batchNumber}
                  onChange={handleChange}
                  className="font-mono text-xs tracking-[0.1em] h-11 bg-slate-900/80 border-slate-700/50 text-slate-200 font-bold text-center focus-visible:ring-1 focus-visible:ring-primary/30"
                  tabIndex={-1}
                  onFocus={(e) => e.currentTarget.select()}
                  required
                />
              </div>
            </div>
          </div>

          <div className="border-t border-border/40" />

          {/* ── Section: Logistics ── */}
          <div className="grid grid-cols-2 gap-6">
            <div className="grid gap-2">
              <Label htmlFor="expiryDate">Expiry Date <span className="text-destructive">*</span></Label>
              <Input
                type="date" id="expiryDate" name="expiryDate"
                value={form.expiryDate}
                onChange={handleChange}
                className="h-11"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="quantity">Quantity <span className="text-destructive">*</span></Label>
              <Input
                type="number" id="quantity" name="quantity"
                min={1}
                value={form.quantity}
                onChange={handleChange}
                className="h-11"
                required
                onFocus={(e) => e.currentTarget.select()}
              />
            </div>
          </div>

          <div className="border-t border-border/40" />

          {/* ── Section: Finance ── */}
          <div className="grid grid-cols-2 gap-6">
            <div className="grid gap-2">
              <Label htmlFor="costPrice">Cost Price (₹)</Label>
              <Input
                type="number" step="0.01" id="costPrice" name="costPrice"
                min={0}
                value={form.costPrice}
                onChange={handleChange}
                className="h-11 bg-muted/20"
                onFocus={(e) => e.currentTarget.select()}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sellingPrice">Selling Price (₹) <span className="text-destructive">*</span></Label>
              <Input
                type="number" step="0.01" id="sellingPrice" name="sellingPrice"
                min={0}
                value={form.sellingPrice}
                onChange={handleChange}
                className="h-11 font-bold text-primary"
                required
                onFocus={(e) => e.currentTarget.select()}
              />
            </div>
          </div>

          <DialogFooter className="pt-4 border-t border-border/40">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" size="lg" className="px-8 shadow-lg shadow-primary/20" disabled={loading}>
              {loading ? "Adding..." : "Add Batch"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}