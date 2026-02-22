"use client"

import { useState } from "react"
import PageContainer from "@/components/PageContainer"
import MainLayout from "@/components/MainLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import BarcodeScanner from "@/components/BarcodeScanner"
import { searchProducts, processBill } from "@/actions/inventory"
import { Loader2, Plus, Minus, Trash2, Search } from "lucide-react"

interface Product {
  id: string
  name: string
  barcode: string
  stock: number
  price: number
  isExpired?: boolean
  isExpiringSoon?: boolean
}

interface BillItem extends Product {
  quantity: number
}

export default function BillingPage() {
  const [billItems, setBillItems] = useState<BillItem[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<Product[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  const handleApplySearch = async () => {
    if (!searchQuery) return
    setIsSearching(true)
    try {
      const results = await searchProducts(searchQuery)
      setSearchResults(results)
    } finally {
      setIsSearching(false)
    }
  }

  const handleScanSuccess = async (decodedText: string) => {
    // Determine if product is already in bill? No, let's fetch first.
    // Or fetch solely to get details.
    setIsSearching(true)
    try {
      const results = await searchProducts(decodedText)
      if (results.length > 0) {
        // Automatically add first match if exact barcode match
        const exactMatch = results.find(p => p.barcode === decodedText)
        if (exactMatch) {
            addToBill(exactMatch)
        } else {
            setSearchResults(results)
        }
      }
    } finally {
      setIsSearching(false)
    }
  }

  const addToBill = (product: Product) => {
    if (product.isExpired) {
      alert(`SAFETY LOCK: Cannot add ${product.name} to bill because the available stock is expired!`)
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
      return [...prev, { ...product, quantity: 1 }]
    })
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
        price: item.price
      }))
      
      const result = await processBill(payload as any) // actions/inventory returns generic object
      if (result.success) {
        setBillItems([])
        alert("Bill processed successfully!")
      } else {
        alert(result.error || "Failed to process bill.")
      }
    } catch (e) {
      console.error(e)
      alert("Failed to process bill.")
    } finally {
      setIsProcessing(false)
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
                            <div className="flex flex-col">
                                <span>{item.name}</span>
                                <span className="text-xs text-muted-foreground">{item.barcode}</span>
                            </div>
                          </TableCell>
                          <TableCell>₹{item.price.toFixed(2)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateQuantity(item.id, -1)}>
                                -
                              </Button>
                              <span className="w-4 text-center">{item.quantity}</span>
                              <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateQuantity(item.id, 1)}>
                                +
                              </Button>
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
              <div className="p-6 bg-muted/20 border-t border-border/40">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-lg font-medium">Total Amount</span>
                  <span className="text-2xl font-bold">₹{totalAmount.toFixed(2)}</span>
                </div>
                <Button 
                    size="lg" 
                    className="w-full" 
                    disabled={billItems.length === 0 || isProcessing} 
                    onClick={handleProcessBill}
                >
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
                    <div className="flex gap-2">
                      <Input 
                        placeholder="Name or Barcode" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleApplySearch()}
                      />
                      <Button onClick={handleApplySearch} disabled={isSearching}>
                        {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                      </Button>
                    </div>

                    <div className="space-y-2 max-h-[400px] overflow-auto">
                        {searchResults.map(product => (
                            <div key={product.id} className={`flex items-center justify-between p-3 border rounded-lg bg-card hover:bg-muted/50 transition-colors ${!product.isExpired ? 'cursor-pointer' : 'opacity-75'}`} onClick={() => !product.isExpired && addToBill(product)}>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="font-medium text-sm">{product.name}</p>
                                        {product.isExpired && <span className="text-[10px] font-bold text-destructive bg-destructive/10 px-1.5 py-0.5 rounded">EXPIRED</span>}
                                        {product.isExpiringSoon && !product.isExpired && <span className="text-[10px] font-bold text-yellow-600 bg-yellow-500/10 px-1.5 py-0.5 rounded">EXPIRING SOON</span>}
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
                    <div className="mt-4">
                        <BarcodeScanner 
                            onScanSuccess={handleScanSuccess} 
                            onScanFailure={(err) => console.log(err)} 
                        />
                        <p className="text-xs text-center text-muted-foreground mt-2">
                            Point camera at a barcode to scan.
                        </p>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </MainLayout>
    </PageContainer>
  )
}
