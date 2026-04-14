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
import { PackagePlus, Edit2 } from "lucide-react"
import { toast } from "sonner"
import { addBatchToMedicine, getAutoBatchDetails, updateBatch } from "@/actions/inventory"
import { useRouter } from "next/navigation"


interface AddBatchDialogProps {
  medicineId: string
  medicineName: string
  editBatchId?: string
  initialData?: {
    barcode: string
    batchNumber: string
    quantity: number
    costPrice: number
    sellingPrice: number
    expiryDate: string // YYYY-MM-DD
  }
}

const EMPTY_FORM = {
  barcode: "",
  batchNumber: "",
  quantity: 1,
  costPrice: 0,
  sellingPrice: 0,
  expiryDate: "",
}

export function AddBatchDialog({ medicineId, medicineName, editBatchId, initialData }: AddBatchDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState(initialData || EMPTY_FORM)
  const router = useRouter()

  const isEditing = !!editBatchId

  // ── Auto-fill next batch details ───────────────────────────────────────────
  useEffect(() => {
    if (open && !isEditing && !form.batchNumber) {
      getAutoBatchDetails(medicineId).then(details => {
        setForm(prev => ({
          ...prev,
          batchNumber: details.batchNumber,
          barcode: details.barcode,
        }))
      })
    }
  }, [open, medicineId, form.batchNumber, isEditing])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.batchNumber.trim()) { toast.error("Batch number is required"); return }
    if (!form.expiryDate) { toast.error("Expiry date is required"); return }
    if (Number(form.quantity) < 0) { toast.error("Quantity cannot be negative"); return }

    setLoading(true)
    try {
      const payload = {
        barcode: form.barcode.trim() || undefined,
        batchNumber: form.batchNumber.trim(),
        quantity: Number(form.quantity),
        costPrice: Number(form.costPrice),
        sellingPrice: Number(form.sellingPrice),
        expiryDate: new Date(form.expiryDate),
      }

      if (isEditing && editBatchId) {
        await updateBatch(editBatchId, payload)
        toast.success(`Batch updated!`)
      } else {
        await addBatchToMedicine(medicineId, payload)
        toast.success(`Batch added to ${medicineName}!`)
      }
      
      setOpen(false)
      if (!isEditing) setForm(EMPTY_FORM)
      router.refresh()
    } catch (err) {
      console.error(err)
      toast.error(isEditing ? "Failed to update batch." : "Failed to add batch.")
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
          className={`h-8 w-8 transition-colors ${isEditing ? "text-muted-foreground/40 hover:text-foreground hover:bg-muted" : "text-muted-foreground hover:text-primary hover:bg-primary/10"}`}
          onClick={e => e.stopPropagation()}
          title={isEditing ? "Edit batch" : "Add batch"}
        >
          {isEditing ? <Edit2 className="h-4 w-4" /> : <PackagePlus className="h-4 w-4" />}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto bg-background text-foreground">
        <DialogHeader>
          <DialogTitle>{isEditing ? `Edit Batch: ${form.batchNumber}` : "Add Stock Batch"}</DialogTitle>
          {isEditing && (
             <DialogDescription>
                Update logistics or pricing details for this batch of {medicineName}.
             </DialogDescription>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-6 py-4">
          <div className="relative bg-muted/10 border border-border/50 rounded-xl p-4 overflow-visible">
            {/* Ticket aesthetics remain the same */}
            <div className="absolute bg-background rounded-full z-10 border border-border/50 w-[18px] h-[18px] -left-[10px] top-[48px] -translate-y-1/2" style={{ clipPath: 'inset(0 0 0 48%)' }} />
            <div className="absolute bg-background rounded-full z-10 border border-border/50 w-[18px] h-[18px] -right-[10px] top-[48px] -translate-y-1/2" style={{ clipPath: 'inset(0 48% 0 0)' }} />

            <div className="flex items-center justify-between mb-4 pb-3 relative">
              <div className="flex items-center gap-2">
                <div className="h-4 w-1 bg-slate-500 rounded-full" />
                <Label className="text-[11px] uppercase tracking-[0.15em] text-slate-400 font-bold">
                  {isEditing ? "Batch Identity" : "Registration Identification"}
                </Label>
              </div>
              <span className="text-[9px] font-black tracking-tighter text-slate-300 bg-slate-800 px-2 py-1 rounded-[4px] border border-slate-700 shadow-sm leading-none uppercase">
                {isEditing ? "MANUAL" : "AUTO"}
              </span>
              <div className="absolute border-b border-dashed border-border/60 bottom-0 left-2 right-2" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5 px-1">
                <Label htmlFor="barcode" className="text-xs font-semibold px-1 text-slate-400">Batch Barcode</Label>
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
                <Label htmlFor="batchNumber" className="text-xs font-semibold px-1 text-slate-400">Batch Number</Label>
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
                min={0}
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
              {loading ? (isEditing ? "Saving..." : "Adding...") : (isEditing ? "Save Changes" : "Add Batch")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}