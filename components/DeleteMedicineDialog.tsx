"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Trash2, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import { deleteMedicine } from "@/actions/inventory"
import { useRouter } from "next/navigation"

interface DeleteMedicineDialogProps {
  medicineId: string
  medicineName: string
  batchCount: number
}

export function DeleteMedicineDialog({ medicineId, medicineName, batchCount }: DeleteMedicineDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleDelete = async () => {
    setLoading(true)
    try {
      await deleteMedicine(medicineId)
      setOpen(false)
      router.refresh()
      toast.success(`"${medicineName}" deleted.`)
    } catch (err) {
      console.error(err)
      toast.error("Failed to delete product.")
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
          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          onClick={e => e.stopPropagation()}
          title="Delete product"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[420px] bg-background text-foreground">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <DialogTitle className="text-lg">Delete Product?</DialogTitle>
          </div>
          <DialogDescription className="text-sm leading-relaxed">
            You're about to permanently delete{" "}
            <span className="font-semibold text-foreground">"{medicineName}"</span>
            {batchCount > 0 && (
              <>
                {" "}and its{" "}
                <span className="font-semibold text-destructive">{batchCount} batch{batchCount !== 1 ? "es" : ""}</span>
              </>
            )}
            . This will also remove any associated billing line items.{" "}
            <span className="font-semibold text-destructive">This action cannot be undone.</span>
          </DialogDescription>
        </DialogHeader>

        {batchCount > 0 && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            ⚠️ This product has <strong>{batchCount}</strong> active batch{batchCount !== 1 ? "es" : ""} with stock. Deleting it will remove all inventory records.
          </div>
        )}

        <DialogFooter className="gap-2 mt-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={loading}>
            {loading ? "Deleting..." : "Yes, Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
