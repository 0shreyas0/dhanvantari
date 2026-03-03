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
import { Plus, RefreshCcw, ScanBarcode } from "lucide-react"
import type { Html5QrcodeScanner } from "html5-qrcode"
import { useEffect, useRef } from "react"

import { createMedicine, getMedicineByBarcode } from "@/actions/inventory"
import { useRouter } from "next/navigation"
import { generateEAN13 } from "@/lib/barcode"

export function AddProductDialog() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const router = useRouter()

  const [formData, setFormData] = useState({
    name: "",
    barcode: "",
    category: "",
    description: "",
    lowStockThreshold: 10,
    // Initial Batch Info
    batchNumber: "",
    quantity: 0,
    costPrice: 0,
    sellingPrice: 0,
    expiryDate: "",
  })

  const scannerRef = useRef<Html5QrcodeScanner | null>(null)

  useEffect(() => {
    let isComponentMounted = true;
    let initTimer: NodeJS.Timeout;

    if (isScanning && !scannerRef.current) {
        initTimer = setTimeout(() => {
            if (!isComponentMounted) return;
            
            // Dynamic import to avoid SSR issues with html5-qrcode
            import("html5-qrcode").then(({ Html5QrcodeScanner }) => {
                if (!isComponentMounted) return; // Unmounted before import finished
                
                // Just double check we didn't mount another one
                if (!scannerRef.current) {
                    const scanner = new Html5QrcodeScanner(
                        "reader-add-product",
                        { fps: 10, qrbox: { width: 250, height: 250 } },
                        false
                    );
                    
                    scanner.render(
                        (decodedText) => {
                            handleBarcodeFound(decodedText);
                            setIsScanning(false);
                            scanner.clear();
                        },
                        (error) => {
                            console.warn(error);
                        }
                    );
                    scannerRef.current = scanner;
                }
            });
        }, 100); // 100ms debounce to bypass React Strict Mode instant double-render
    }

    return () => {
        isComponentMounted = false;
        if (initTimer) clearTimeout(initTimer);
        
        if (scannerRef.current) {
            const scanner = scannerRef.current;
            scannerRef.current = null;
            scanner.clear().catch(console.error);
        }
    }
  }, [isScanning]);



  const generateBarcode = () => {
    const ean13 = generateEAN13();
    setFormData(prev => ({ ...prev, barcode: ean13 }));
  }

  const handleBarcodeFound = async (barcode: string) => {
    setFormData(prev => ({ ...prev, barcode }));
    
    // Check if we already have this product in our inventory
    try {
        const existingMed = await getMedicineByBarcode(barcode);
        if (existingMed) {
            // Auto-fill existing details! They just need to add the new batch.
            setFormData(prev => ({
                ...prev,
                name: existingMed.name || "",
                category: existingMed.category || "",
                description: existingMed.description || "",
                lowStockThreshold: existingMed.lowStockThreshold || 10
            }));
        }
    } catch (e) {
        console.error("Failed to fetch existing medicine", e);
    }
  }

  const handleManualBarcodeBlur = () => {
      if (formData.barcode) {
          handleBarcodeFound(formData.barcode);
      }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    let finalBarcode = formData.barcode.trim();
    if (!finalBarcode) {
        finalBarcode = generateEAN13();
    }

    try {
        await createMedicine({
            name: formData.name,
            barcode: finalBarcode,
            category: formData.category,
            description: formData.description,
            lowStockThreshold: Number(formData.lowStockThreshold),
            initialBatch: {
                batchNumber: formData.batchNumber,
                quantity: Number(formData.quantity),
                costPrice: Number(formData.costPrice),
                sellingPrice: Number(formData.sellingPrice),
                expiryDate: new Date(formData.expiryDate)
            }
        });
        setOpen(false);
        setFormData({
            name: "",
            barcode: "",
            category: "",
            description: "",
            lowStockThreshold: 10,
            batchNumber: "",
            quantity: 0,
            costPrice: 0,
            sellingPrice: 0,
            expiryDate: "",
        });
        router.refresh();
    } catch (error) {
        console.error("Failed to create product:", error);
        alert("Failed to create product. Please try again.");
    } finally {
        setLoading(false);
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
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-background text-foreground">
        <DialogHeader>
          <DialogTitle>Add New Product</DialogTitle>
          <DialogDescription>
            Enter the details of the new medicine. Scan or generate a barcode.
          </DialogDescription>
        </DialogHeader>

        {isScanning && (
            <div className="mb-4 rounded-xl border border-border overflow-hidden bg-card">
                <style dangerouslySetInnerHTML={{ __html: `
                  #reader-add-product { border: none !important; background: transparent !important; padding: 20px 0 !important; }
                  #reader-add-product * { border: none !important; box-shadow: none !important; }
                  #reader-add-product__dashboard_section_csr > span { color: var(--color-foreground) !important; margin-bottom: 8px !important; display: block !important; font-size: 14px !important; text-align: center !important; }
                  #reader-add-product button, #reader-add-product span[id*="anchor-scan-type-change"] { 
                    background: var(--color-primary) !important; 
                    color: var(--color-primary-foreground) !important; 
                    border-radius: 6px !important; 
                    padding: 8px 16px !important; 
                    font-size: 14px !important;
                    font-weight: 500 !important;
                    text-decoration: none !important;
                    margin: 8px auto !important;
                    width: 100% !important;
                    max-width: 260px !important;
                    cursor: pointer !important;
                    transition: opacity 0.2s !important;
                    text-align: center !important;
                    /* Omitting !important on display allows the library's inline 'display: none' to work */
                    display: inline-block;
                  }
                  #reader-add-product span[id*="anchor-scan-type-change"] {
                    display: block;
                  }
                  #reader-add-product button:hover, #reader-add-product span[id*="anchor-scan-type-change"]:hover { opacity: 0.9 !important; }
                  #reader-add-product img { opacity: 0.7 !important; display: block !important; margin: 0 auto 16px auto !important; max-width: 100px !important; }
                  :is(.dark, [data-theme="dark"]) #reader-add-product img { filter: brightness(0) invert(1) !important; }
                `}} />
                <div id="reader-add-product" className="w-full relative"></div>
                <Button variant="outline" onClick={() => setIsScanning(false)} className="w-full rounded-t-none border-x-0 border-b-0">
                    Cancel Scan
                </Button>
            </div>
        )}

        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          
          <div className="grid gap-2 border-b border-border/40 pb-6 mb-2">
            <Label htmlFor="barcode" className="text-base font-semibold text-primary">Step 1: Identify Product</Label>
            <p className="text-sm text-muted-foreground mb-2">Scan the manufacturer's barcode to instantly tag this inventory.</p>
            
            {!isScanning && (
                <Button type="button" onClick={() => setIsScanning(true)} className="w-full gap-2 mb-2" size="lg">
                    <ScanBarcode className="h-5 w-5" />
                    Scan Manufacturer Barcode
                </Button>
            )}
            
            <div className="flex gap-2 items-center mt-2">
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider w-16 text-center">OR</span>
                <Input
                id="barcode"
                name="barcode"
                value={formData.barcode}
                onChange={handleChange}
                onBlur={handleManualBarcodeBlur}
                placeholder="Enter manually or leave blank to auto-generate"
                className="flex-1"
                />
                <Button type="button" variant="outline" size="icon" onClick={generateBarcode} title="Generate In-Store Barcode">
                    <RefreshCcw className="h-4 w-4" />
                </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
                <Label htmlFor="name">Medicine Name</Label>
                <Input id="name" name="name" value={formData.name} onChange={handleChange} required />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="category">Category</Label>
                <Input id="category" name="category" value={formData.category} onChange={handleChange} placeholder="e.g. Antibiotic" />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Input id="description" name="description" value={formData.description} onChange={handleChange} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="lowStockThreshold">Low Stock Threshold</Label>
            <Input type="number" id="lowStockThreshold" name="lowStockThreshold" value={formData.lowStockThreshold} onChange={handleChange} required />
          </div>

          <div className="border-t pt-4 mt-2">
             <h4 className="font-semibold mb-3 text-sm text-muted-foreground">Initial Batch Details</h4>
             <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                    <Label htmlFor="batchNumber">Batch Number</Label>
                    <Input id="batchNumber" name="batchNumber" value={formData.batchNumber} onChange={handleChange} required />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="expiryDate">Expiry Date</Label>
                    <Input type="date" id="expiryDate" name="expiryDate" value={formData.expiryDate} onChange={handleChange} required />
                </div>
             </div>
             <div className="grid grid-cols-3 gap-4 mt-4">
                <div className="grid gap-2">
                    <Label htmlFor="quantity">Quantity</Label>
                    <Input type="number" id="quantity" name="quantity" value={formData.quantity} onChange={handleChange} required />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="costPrice">Cost Price</Label>
                    <Input type="number" step="0.01" id="costPrice" name="costPrice" value={formData.costPrice} onChange={handleChange} required />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="sellingPrice">Selling Price</Label>
                    <Input type="number" step="0.01" id="sellingPrice" name="sellingPrice" value={formData.sellingPrice} onChange={handleChange} required />
                </div>
             </div>
          </div>

          <DialogFooter className="mt-6">
            <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : "Save Product"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
