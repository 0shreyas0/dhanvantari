"use client"

import { useState } from "react"
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
import { Plus } from "lucide-react"
import { toast } from "sonner"
import { createMedicineOnly } from "@/actions/inventory"
import { useRouter } from "next/navigation"

export function AddProductDialog() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const [form, setForm] = useState({
    name: "",
    category: "",
    description: "",
    lowStockThreshold: 10,
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { toast.error("Medicine name is required"); return }
    setLoading(true)
    try {
      await createMedicineOnly({
        name: form.name.trim(),
        category: form.category.trim() || undefined,
        description: form.description.trim() || undefined,
        lowStockThreshold: Number(form.lowStockThreshold),
      })
      setOpen(false)
      setForm({ name: "", category: "", description: "", lowStockThreshold: 10 })
      router.refresh()
      toast.success("Product added! Now add a batch to register stock.")
    } catch (err) {
      console.error(err)
      toast.error("Failed to add product.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add Product
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[480px] bg-background text-foreground">
        <DialogHeader>
          <DialogTitle>Add New Product</DialogTitle>
          <DialogDescription>
            Define the medicine. You can add stock batches from the inventory table once it's created.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          {/* Name + Category */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Medicine Name <span className="text-destructive">*</span></Label>
              <Input
                id="name" name="name"
                placeholder="e.g. Paracetamol 500mg"
                value={form.name}
                onChange={handleChange}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="category">Category</Label>
              <Input
                id="category" name="category"
                placeholder="e.g. Analgesic"
                value={form.category}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Description */}
          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description" name="description"
              placeholder="Optional notes about this medicine"
              value={form.description}
              onChange={handleChange}
            />
          </div>

          {/* Low Stock Threshold */}
          <div className="grid gap-2">
            <Label htmlFor="lowStockThreshold">Low Stock Alert Threshold</Label>
            <Input
              type="number" id="lowStockThreshold" name="lowStockThreshold"
              min={0}
              value={form.lowStockThreshold}
              onChange={handleChange}
            />
            <p className="text-xs text-muted-foreground">
              You'll be alerted when total stock drops below this number.
            </p>
          </div>

          <DialogFooter className="mt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Product"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
