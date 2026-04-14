"use client"

import { useState, useEffect, useRef } from "react"
import PageContainer from "@/components/PageContainer"
import MainLayout from "@/components/MainLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import BarcodeScanner from "@/components/BarcodeScanner"
import { searchProducts, processBill, getBillDetails } from "@/actions/inventory"
import { sendWhatsAppReceipt } from "@/actions/whatsapp"
import { sendEmailReceipt } from "@/actions/email"
import { getExpirySettings } from "@/actions/settings"
import { Loader2, Plus, Minus, Trash2, Search, CheckCircle2, Share2, MessageCircle, Send, Mail, ScanBarcode, ImageUp, AlertTriangle } from "lucide-react"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { format } from "date-fns"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { DEFAULT_EXPIRY_SETTINGS, ExpirySettings } from "@/lib/expiry"

interface Product {
  id: string
  name: string
  barcodes: string // Combined string of all batch barcodes
  stock: number
  price: number
  isExpired?: boolean
  isExpiringSoon?: boolean
  expiryDate?: string | null
  daysToExpiry?: number | null
}

interface BillItem extends Product {
  quantity: number
  isNearExpiry?: boolean   // flagged when added in critical range
}

export default function BillingPage() {
  const [billItems, setBillItems] = useState<BillItem[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<Product[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  
  // Customer details
  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [customerEmail, setCustomerEmail] = useState("")

  // Expiry settings (loaded once)
  const [expirySettings, setExpirySettings] = useState<ExpirySettings>(DEFAULT_EXPIRY_SETTINGS)

  // Critical-range confirmation dialog
  const [criticalProduct, setCriticalProduct] = useState<Product | null>(null)

  // Success State
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)
  const [lastBill, setLastBill] = useState<any>(null)
  const [nearExpiryCount, setNearExpiryCount] = useState(0)
  const [isSendingWa, setIsSendingWa] = useState(false)
  const [isSendingEmail, setIsSendingEmail] = useState(false)
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [lastCustomerEmail, setLastCustomerEmail] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Debounce ref for barcode scanner
  const lastScannedRef = useRef<{ code: string; time: number }>({ code: "", time: 0 })

  // Load expiry settings once on mount
  useEffect(() => {
    getExpirySettings().then(s => {
      if (s) {
        setExpirySettings({
          earlyWarningDays: s.earlyWarningDays,
          urgentWarningDays: s.urgentWarningDays,
          criticalDays: s.criticalDays,
        })
      }
    })
  }, [])

  const handleApplySearch = async (query: string) => {
    if (!query) { setSearchResults([]); return }
    setIsSearching(true)
    try {
      const results = await searchProducts(query)
      setSearchResults(results)
    } finally {
      setIsSearching(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => handleApplySearch(searchQuery.trim()), 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const handleScanSuccess = async (decodedText: string) => {
    const now = Date.now()
    if (decodedText === lastScannedRef.current.code && (now - lastScannedRef.current.time) < 2000) return
    lastScannedRef.current = { code: decodedText, time: now }

    setIsSearching(true)
    try {
      const results = await searchProducts(decodedText)
      if (results.length > 0) {
        // Find if any result contains our scanned barcode in its barcodes string
        const exactMatch = (results as Product[]).find(p => 
          p.barcodes && p.barcodes.split(" ").some(bc => bc === decodedText)
        )
        if (exactMatch) addToBill(exactMatch)
        else setSearchResults(results as Product[])
      }
    } finally {
      setIsSearching(false)
    }
  }

  /** Core add-to-bill with expiry guards */
  const addToBill = (product: Product, confirmed = false) => {
    // 1. Block expired items completely
    if (product.isExpired) {
      const expDateStr = product.expiryDate
        ? format(new Date(product.expiryDate), "dd MMM yyyy")
        : "unknown date"
      toast.error(
        `Cannot add ${product.name} — expired on ${expDateStr}. Please remove from shelf.`,
        { duration: 5000 }
      )
      return
    }

    // 2. Confirm for critical-range items (unless already confirmed)
    const isCritical =
      product.daysToExpiry !== null &&
      product.daysToExpiry !== undefined &&
      product.daysToExpiry <= expirySettings.criticalDays
    
    if (isCritical && !confirmed) {
      setCriticalProduct(product)
      return
    }

    setBillItems(prev => {
      const existing = prev.find(item => item.id === product.id)
      if (existing) {
        return prev.map(item =>
          item.id === product.id
            ? { ...item, quantity: Math.min(item.quantity + 1, item.stock) }
            : item
        )
      }
      return [...prev, { ...product, quantity: 1, isNearExpiry: isCritical || !!product.isExpiringSoon }]
    })
  }

  const confirmCriticalAdd = () => {
    if (criticalProduct) {
      addToBill(criticalProduct, true)
      setCriticalProduct(null)
    }
  }

  const updateQuantity = (id: string, delta: number) => {
    setBillItems(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, Math.min(item.quantity + delta, item.stock))
        return { ...item, quantity: newQty }
      }
      return item
    }))
  }

  const removeItem = (id: string) => {
    setBillItems(prev => prev.filter(item => item.id !== id))
  }

  const handleProcessBill = async () => {
    if (billItems.length === 0) return
    setIsProcessing(true)
    try {
      const payload = billItems.map(item => ({
        medicineId: item.id,
        quantity: item.quantity,
        price: item.price,
      }))
      
      const result = await processBill(payload as any, { name: customerName, phone: customerPhone })
      if (result.success && result.billId) {
        const details = await getBillDetails(result.billId)
        setLastBill(details)
        setNearExpiryCount(billItems.filter(i => i.isNearExpiry).length)
        setLastCustomerEmail(customerEmail) // Preserve email for success dialog before clearing
        setShowSuccessDialog(true)
        setBillItems([])
        setCustomerName("")
        setCustomerPhone("")
        setCustomerEmail("")
        toast.success("Bill processed successfully")
      } else {
        toast.error(result.error || "Failed to process bill.")
      }
    } catch (e) {
      console.error(e)
      toast.error("Failed to process bill.")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleWhatsAppShare = async () => {
    if (!lastBill || !lastBill.customerPhone) {
        toast.error("Please provide a customer phone number first.")
        return
    }
    setIsSendingWa(true)
    try {
      const result = await sendWhatsAppReceipt(
        lastBill.customerPhone,
        lastBill.customerName || "Customer",
        lastBill.id,
        lastBill.totalAmount,
        lastBill.items.map((item: any) => ({
          name: item.medicine.name,
          quantity: item.quantity,
          price: item.price,
        })),
        lastBill.pharmacyName
      )
      if (result.success) toast.success("Bot has sent the message successfully!")
      else toast.error(`Bot failed: ${result.error}`)
    } catch (e) {
      console.error(e)
      toast.error("Failed to trigger Bot.")
    } finally {
      setIsSendingWa(false)
    }
  }

  const handleEmailShare = async () => {
    if (!lastBill || !lastCustomerEmail) {
        toast.error("Please provide a valid email address.")
        return
    }
    setIsSendingEmail(true)
    try {
      const result = await sendEmailReceipt(
        lastCustomerEmail,
        lastBill.customerName || "Customer",
        lastBill.id,
        lastBill.totalAmount,
        lastBill.items.map((item: any) => ({
          name: item.medicine.name,
          quantity: item.quantity,
          price: item.price,
        })),
        lastBill.pharmacyName
      )
      if (result.success) toast.success("Email receipt sent successfully!")
      else toast.error(`Email failed: ${result.error}`)
    } catch (e) {
      console.error(e)
      toast.error("Failed to send Email.")
    } finally {
      setIsSendingEmail(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    toast.loading("Scanning for barcodes...")
    
    try {
      let fileToScan = file
      
      if (file.type === "application/pdf") {
        const pdfJS = await import("pdfjs-dist")
        pdfJS.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfJS.version}/build/pdf.worker.min.mjs`
        
        const arrayBuffer = await file.arrayBuffer()
        const pdf = await pdfJS.getDocument({ data: arrayBuffer }).promise
        const page = await pdf.getPage(1)
        
        const viewport = page.getViewport({ scale: 4.0 })
        const canvas = document.createElement("canvas")
        const context = canvas.getContext("2d")
        canvas.height = viewport.height
        canvas.width = viewport.width
        
        if (context) {
          context.fillStyle = "white"
          context.fillRect(0, 0, canvas.width, canvas.height)
          await page.render({ canvasContext: context, viewport }).promise
          const dataUrl = canvas.toDataURL("image/png")
          const blob = await (await fetch(dataUrl)).blob()
          fileToScan = new File([blob], "converted-pdf.png", { type: "image/png" })
        }
      }

      const { Html5Qrcode } = await import("html5-qrcode")
      
      const tempDivId = "hidden-reader"
      let tempDiv = document.getElementById(tempDivId)
      if (!tempDiv) {
          tempDiv = document.createElement("div")
          tempDiv.id = tempDivId
          tempDiv.style.display = "none"
          document.body.appendChild(tempDiv)
      }

      const html5QrCode = new Html5Qrcode(tempDivId)
      const decodedText = await html5QrCode.scanFileV2(fileToScan, false)
      await handleScanSuccess(decodedText.decodedText)
      toast.success("Barcode detected from file!")
    } catch (err) {
      console.error(err)
      toast.error("Could not find a valid barcode in that file.")
    } finally {
        e.target.value = ""
        toast.dismiss()
    }
  }

  const totalAmount = billItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)

  return (
    <PageContainer>
      <MainLayout>
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Billing</h1>
          <p className="text-muted-foreground">Create bills and manage sales.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Bill Items */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="h-full flex flex-col">
              <CardHeader className="border-b border-border/40">
                <CardTitle>Current Bill</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="w-[100px]">Price</TableHead>
                      <TableHead className="w-[120px]">Qty</TableHead>
                      <TableHead className="w-[100px] text-right">Total</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {billItems.length > 0 ? (
                      billItems.map(item => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">
                            <div className="flex flex-col gap-0.5">
                                <span>{item.name}</span>
                                <span className="text-xs text-muted-foreground">{item.barcode}</span>
                                {item.isNearExpiry && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-600/30 px-1.5 py-0.5 rounded w-fit">
                                    <AlertTriangle className="h-2.5 w-2.5" />
                                    ⚠️ Near expiry
                                  </span>
                                )}
                            </div>
                          </TableCell>
                          <TableCell>₹{item.price.toFixed(2)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateQuantity(item.id, -1)}>-</Button>
                              <span className="w-4 text-center">{item.quantity}</span>
                              <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateQuantity(item.id, 1)}>+</Button>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">₹{(item.price * item.quantity).toFixed(2)}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => removeItem(item.id)}>
                              <Trash2 size={16} />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="h-48 text-center text-muted-foreground">
                          No items in bill. Scan or search products to add.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
              <div className="p-6 bg-muted/20 border-t border-border/40 space-y-4">
                <div className="grid grid-cols-2 gap-4 border-b border-border/40 pb-4">
                  <div>
                    <Label htmlFor="customerName" className="text-xs text-muted-foreground mb-1.5 block">Customer Name (Optional)</Label>
                    <Input id="customerName" placeholder="e.g. Rahul Patil" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="bg-background" onFocus={(e) => e.currentTarget.select()} />
                  </div>
                  <div>
                    <Label htmlFor="customerPhone" className="text-xs text-muted-foreground mb-1.5 block">Phone Number (Optional)</Label>
                    <Input id="customerPhone" placeholder="e.g. 9876543210" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className="bg-background" onFocus={(e) => e.currentTarget.select()} />
                  </div>
                  <div className="col-span-2 mt-2">
                    <Label htmlFor="customerEmail" className="text-xs text-muted-foreground mb-1.5 block">Email Address (Optional)</Label>
                    <Input id="customerEmail" type="email" placeholder="e.g. customer@example.com" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} className="bg-background" onFocus={(e) => e.currentTarget.select()} />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 mb-4">
                  <span className="text-lg font-medium">Total Amount</span>
                  <span className="text-2xl font-bold">₹{totalAmount.toFixed(2)}</span>
                </div>
                <Button size="lg" className="w-full" disabled={billItems.length === 0 || isProcessing} onClick={handleProcessBill}>
                  {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isProcessing ? "Processing..." : "Create Bill"}
                </Button>
              </div>
            </Card>
          </div>

          {/* Right Column: Scan/Search */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Add Products</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="scan" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-4">
                    <TabsTrigger value="scan">Scan</TabsTrigger>
                    <TabsTrigger value="search">Search</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="search" className="space-y-4">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        {isSearching ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : <Search className="h-4 w-4 text-muted-foreground" />}
                      </div>
                      <Input 
                        placeholder="Search by name or barcode..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 h-10 w-full"
                        onFocus={(e) => e.currentTarget.select()}
                      />
                    </div>

                    <div className="space-y-2 max-h-[400px] overflow-auto">
                        {searchResults.map(product => (
                            <div
                              key={product.id}
                              className={`flex items-center justify-between p-3 border rounded-lg bg-card hover:bg-muted/50 transition-colors ${!product.isExpired ? 'cursor-pointer' : 'opacity-75'}`}
                              onClick={() => !product.isExpired && addToBill(product)}
                            >
                                <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className="font-medium text-sm">{product.name}</p>
                                        {product.isExpired && <span className="text-[10px] font-bold text-destructive bg-destructive/10 px-1.5 py-0.5 rounded">EXPIRED</span>}
                                        {product.isExpiringSoon && !product.isExpired && (
                                          product.daysToExpiry !== null && product.daysToExpiry !== undefined && product.daysToExpiry <= expirySettings.criticalDays
                                            ? <span className="text-[10px] font-bold text-red-600 bg-red-500/10 px-1.5 py-0.5 rounded">CRITICAL — {product.daysToExpiry}d</span>
                                            : <span className="text-[10px] font-bold text-yellow-600 bg-yellow-500/10 px-1.5 py-0.5 rounded">EXPIRING SOON</span>
                                        )}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-0.5">₹{product.price} • Stock: {product.stock}</p>
                                </div>
                                <Button size="sm" variant={product.isExpired ? "destructive" : "ghost"} className="h-8 w-8 p-0" disabled={product.isExpired}>
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                        {searchResults.length === 0 && !isSearching && searchQuery && (
                            <p className="text-sm text-center text-muted-foreground py-4">No results found.</p>
                        )}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="scan">
                    <div className="mt-4 space-y-4">
                        {!isCameraActive ? (
                            <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl bg-muted/30">
                                <ScanBarcode className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                                <h3 className="text-sm font-medium mb-4">Camera is Disengaged</h3>
                                <div className="grid grid-cols-1 w-full gap-3">
                                    <Button size="lg" className="w-full gap-2 bg-primary" onClick={() => setIsCameraActive(true)}>
                                        <ScanBarcode className="h-4 w-4" />
                                        Start Scanning Session
                                    </Button>
                                    <Button variant="outline" size="lg" className="w-auto gap-2 border-dashed" onClick={() => fileInputRef.current?.click()}>
                                        <ImageUp className="h-4 w-4" />
                                        Upload Image File
                                    </Button>
                                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*,.pdf" onChange={handleFileUpload} />
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <BarcodeScanner onScanSuccess={handleScanSuccess} onScanFailure={(err) => console.log(err)} />
                                <Button variant="destructive" className="w-full gap-2 py-6" onClick={() => setIsCameraActive(false)}>
                                    Stop Camera / Disengage
                                </Button>
                                <p className="text-[10px] text-center text-muted-foreground">The scanner is now live. Point camera at a barcode.</p>
                            </div>
                        )}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ── Critical Expiry Confirmation Dialog ──────────────────────────────── */}
        <Dialog open={!!criticalProduct} onOpenChange={() => setCriticalProduct(null)}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <div className="flex justify-center mb-3">
                <div className="h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <AlertTriangle className="h-7 w-7 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
              <DialogTitle className="text-center">Near-Expiry Medicine</DialogTitle>
              <DialogDescription className="text-center space-y-1">
                <span className="block font-semibold text-foreground">{criticalProduct?.name}</span>
                {criticalProduct?.expiryDate && (
                  <span className="block">
                    Expires on{" "}
                    <span className="font-medium text-destructive">
                      {format(new Date(criticalProduct.expiryDate), "dd MMM yyyy")}
                    </span>
                    {criticalProduct.daysToExpiry !== null && criticalProduct.daysToExpiry !== undefined && (
                      <span className="text-muted-foreground"> ({criticalProduct.daysToExpiry} days remaining)</span>
                    )}
                  </span>
                )}
                <span className="block text-sm mt-2">
                  This medicine is in its <span className="text-destructive font-semibold">critical expiry window</span>. 
                  Are you sure you want to add it to the bill?
                </span>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setCriticalProduct(null)}>
                Cancel
              </Button>
              <Button variant="destructive" className="flex-1" onClick={confirmCriticalAdd}>
                Add Anyway
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Bill Success Dialog ───────────────────────────────────────────────── */}
        <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <div className="flex justify-center mb-4">
                <div className="h-12 w-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <DialogTitle className="text-center text-xl">Bill Generated Successfully!</DialogTitle>
              <DialogDescription className="text-center">
                The bill has been saved and inventory has been updated.
              </DialogDescription>
            </DialogHeader>
            
            <div className="bg-muted/30 p-4 rounded-lg border border-border/50 space-y-2 mt-2">
               <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Bill ID:</span>
                  <span className="font-mono font-medium">{lastBill?.id?.slice(-8).toUpperCase()}</span>
               </div>
               <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Customer:</span>
                  <span className="font-medium">{lastBill?.customerName || "Walk-in Customer"}</span>
               </div>
               <div className="flex justify-between text-sm pt-2 border-t border-border">
                  <span className="font-semibold">Total Paid:</span>
                  <span className="font-bold text-primary text-lg">₹{lastBill?.totalAmount?.toFixed(2)}</span>
               </div>
               {nearExpiryCount > 0 && (
                 <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-600/30 rounded-md px-3 py-2 mt-1">
                   <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                   ⚠️ {nearExpiryCount} item{nearExpiryCount > 1 ? "s" : ""} near expiry included in this bill
                 </div>
               )}
            </div>

            <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-4">
              <Button variant="outline" className="flex-1 gap-2 border-green-200 hover:bg-green-50 dark:border-green-800/20" disabled={isSendingWa || !lastBill?.customerPhone} onClick={handleWhatsAppShare}>
                {isSendingWa ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4 text-green-600" />}
                {isSendingWa ? "Sending..." : "Send WhatsApp"}
              </Button>
              <Button variant="outline" className="flex-1 gap-2 border-blue-200 hover:bg-blue-50 dark:border-blue-800/20" disabled={isSendingEmail || !lastCustomerEmail} onClick={handleEmailShare}>
                {isSendingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4 text-blue-600" />}
                {isSendingEmail ? "Sending..." : "Send Email"}
              </Button>
              <Button 
                variant="default" 
                className="flex-1"
                onClick={() => {
                  setShowSuccessDialog(false)
                  setTimeout(() => {
                    setCustomerName("")
                    setCustomerPhone("")
                    setCustomerEmail("")
                  }, 300) // Delay reset slightly until dialog transition finishes
                }}
              >
                Done
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </MainLayout>
    </PageContainer>
  )
}
