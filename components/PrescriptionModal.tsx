"use client"

import { useState, useRef, useCallback } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useUploadThing } from "@/lib/uploadthing"
import { searchProducts } from "@/actions/inventory"
import {
  Loader2,
  Search,
  Plus,
  FileText,
  ImageUp,
  X,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Trash2,
  PackageX,
} from "lucide-react"
import { toast } from "sonner"

interface Product {
  id: string
  name: string
  barcodes: string
  stock: number
  price: number
  isExpired?: boolean
  isExpiringSoon?: boolean
  expiryDate?: string | null
  daysToExpiry?: number | null
}

interface PrescriptionModalProps {
  open: boolean
  onClose: () => void
  prescriptionUrl: string | null
  onPrescriptionUploaded: (url: string) => void
  onPrescriptionRemoved: () => void
  onAddToBill: (product: Product) => void
  billItemIds: Set<string> // IDs already in the bill
}

type ModalState = "idle" | "uploading" | "ready"

export default function PrescriptionModal({
  open,
  onClose,
  prescriptionUrl,
  onPrescriptionUploaded,
  onPrescriptionRemoved,
  onAddToBill,
  billItemIds,
}: PrescriptionModalProps) {
  const [modalState, setModalState] = useState<ModalState>(
    prescriptionUrl ? "ready" : "idle"
  )
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isDragging, setIsDragging] = useState(false)

  // Medicine search state
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<Product[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const { startUpload } = useUploadThing("prescriptionUpload", {
    onUploadBegin: () => {
      setModalState("uploading")
      setUploadProgress(10)
    },
    onUploadProgress: (p) => setUploadProgress(p),
    onClientUploadComplete: (res) => {
      const url = res?.[0]?.ufsUrl
      if (url) {
        onPrescriptionUploaded(url)
        setModalState("ready")
        setUploadProgress(100)
        toast.success("Prescription uploaded successfully")
      }
    },
    onUploadError: (err) => {
      setModalState("idle")
      setUploadProgress(0)
      toast.error(err.message || "Upload failed — please try again")
    },
  })

  const handleFileSelect = (file: File) => {
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"]
    if (!validTypes.includes(file.type)) {
      toast.error("Only images (JPG, PNG, WEBP) and PDFs are accepted")
      return
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("File is too large. Maximum size is 8MB")
      return
    }
    startUpload([file])
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFileSelect(file)
    e.target.value = ""
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFileSelect(file)
  }, [])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => setIsDragging(false)

  const handleSearch = async (q: string) => {
    setSearchQuery(q)
    if (!q.trim()) {
      setSearchResults([])
      setHasSearched(false)
      return
    }
    setIsSearching(true)
    setHasSearched(true)
    try {
      const results = await searchProducts(q.trim())
      setSearchResults(results as Product[])
    } catch {
      toast.error("Search failed")
    } finally {
      setIsSearching(false)
    }
  }

  const handleRemove = () => {
    onPrescriptionRemoved()
    setModalState("idle")
    setSearchQuery("")
    setSearchResults([])
    setHasSearched(false)
    setUploadProgress(0)
  }

  const isPdf = prescriptionUrl?.includes(".pdf") ||
    prescriptionUrl?.toLowerCase().includes("pdf")

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-border/50 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4 text-primary" />
            Attach Prescription
          </DialogTitle>
        </DialogHeader>

        {/* ── State: Idle (upload dropzone) ──────────────────────────── */}
        {modalState === "idle" && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 gap-6">
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`
                w-full max-w-sm flex flex-col items-center justify-center gap-4
                border-2 border-dashed rounded-2xl p-10 cursor-pointer
                transition-all duration-200 select-none
                ${isDragging
                  ? "border-primary bg-primary/5 scale-[1.02]"
                  : "border-border/60 bg-muted/20 hover:border-primary/50 hover:bg-muted/40"
                }
              `}
            >
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                <ImageUp className="h-7 w-7 text-primary" />
              </div>
              <div className="text-center">
                <p className="font-medium text-sm">Drop prescription here</p>
                <p className="text-xs text-muted-foreground mt-1">
                  or click to browse — JPG, PNG, WEBP, PDF · max 8MB
                </p>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept="image/*,.pdf"
              onChange={handleInputChange}
            />
            <Button variant="ghost" className="text-muted-foreground" onClick={onClose}>
              Cancel
            </Button>
          </div>
        )}

        {/* ── State: Uploading ────────────────────────────────────────── */}
        {modalState === "uploading" && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 gap-5">
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
              <Loader2 className="h-7 w-7 text-primary animate-spin" />
            </div>
            <div className="text-center">
              <p className="font-medium text-sm">Uploading prescription…</p>
              <p className="text-xs text-muted-foreground mt-1">{uploadProgress}% complete</p>
            </div>
            <div className="w-full max-w-xs bg-muted rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-primary h-full rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* ── State: Ready (viewer + search) ─────────────────────────── */}
        {modalState === "ready" && prescriptionUrl && (
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 overflow-hidden min-h-0">

            {/* Left: Image preview */}
            <div className="flex flex-col border-r border-border/50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/30 shrink-0">
                <span className="text-xs font-medium text-muted-foreground">Prescription</span>
                <a
                  href={prescriptionUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  Open full <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <div className="flex-1 overflow-hidden bg-muted/30 flex items-center justify-center p-3">
                {isPdf ? (
                  <div className="flex flex-col items-center gap-3 text-muted-foreground">
                    <FileText className="h-16 w-16 opacity-30" />
                    <p className="text-xs">PDF — click "Open full" to view</p>
                  </div>
                ) : (
                  <img
                    src={prescriptionUrl}
                    alt="Prescription"
                    className="max-h-full max-w-full object-contain rounded-lg shadow"
                  />
                )}
              </div>
              <div className="px-4 py-3 shrink-0 border-t border-border/30">
                <button
                  onClick={handleRemove}
                  className="flex items-center gap-1.5 text-xs text-destructive hover:opacity-70 transition-opacity"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove prescription
                </button>
              </div>
            </div>

            {/* Right: Medicine search */}
            <div className="flex flex-col overflow-hidden">
              <div className="px-4 py-2.5 border-b border-border/30 shrink-0">
                <p className="text-xs font-medium text-muted-foreground">
                  Search &amp; add medicines from prescription
                </p>
              </div>
              <div className="px-4 py-3 shrink-0">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    {isSearching
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                      : <Search className="h-3.5 w-3.5 text-muted-foreground" />
                    }
                  </div>
                  <Input
                    id="prescription-search"
                    placeholder="Type medicine name…"
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="pl-8 h-9 text-sm"
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2 min-h-0">
                {/* Results */}
                {searchResults.map((product) => {
                  const alreadyAdded = billItemIds.has(product.id)
                  const outOfStock = product.stock === 0
                  const isUnavailable = product.isExpired || outOfStock

                  return (
                    <div
                      key={product.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border text-sm transition-colors ${
                        isUnavailable
                          ? "border-border/40 bg-muted/20 opacity-60"
                          : alreadyAdded
                          ? "border-green-500/30 bg-green-500/5"
                          : "border-border/60 bg-card hover:bg-muted/40"
                      }`}
                    >
                      {/* Status icon */}
                      <div className="shrink-0">
                        {alreadyAdded ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                        ) : product.isExpired ? (
                          <AlertTriangle className="h-4 w-4 text-destructive" />
                        ) : outOfStock ? (
                          <PackageX className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{product.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground">₹{product.price}</span>
                          {product.isExpired && (
                            <span className="text-[10px] font-bold text-destructive bg-destructive/10 px-1.5 py-0.5 rounded">EXPIRED</span>
                          )}
                          {outOfStock && !product.isExpired && (
                            <span className="text-[10px] font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">OUT OF STOCK</span>
                          )}
                          {product.isExpiringSoon && !product.isExpired && (
                            <span className="text-[10px] font-bold text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded">EXPIRING SOON</span>
                          )}
                        </div>
                      </div>

                      {/* Action */}
                      {alreadyAdded ? (
                        <span className="text-[10px] font-semibold text-green-600 dark:text-green-400 shrink-0">Added</span>
                      ) : (
                        <Button
                          size="sm"
                          variant={isUnavailable ? "ghost" : "outline"}
                          className="h-7 px-2 shrink-0"
                          disabled={isUnavailable}
                          onClick={() => {
                            onAddToBill(product)
                            // Optimistically reflect in results
                            setSearchResults(prev =>
                              prev.map(p => p.id === product.id ? p : p)
                            )
                          }}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  )
                })}

                {/* Empty states */}
                {hasSearched && !isSearching && searchResults.length === 0 && (
                  <div className="flex flex-col items-center gap-2 py-8 text-center">
                    <PackageX className="h-8 w-8 text-muted-foreground opacity-40" />
                    <p className="text-sm font-medium text-muted-foreground">
                      "{searchQuery}" not found in inventory
                    </p>
                    <p className="text-xs text-muted-foreground/70">
                      Add it to your inventory first, then it'll appear here.
                    </p>
                  </div>
                )}

                {!hasSearched && (
                  <div className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground/60">
                    <Search className="h-8 w-8 opacity-30" />
                    <p className="text-xs">
                      Read the prescription and search each medicine by name
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Footer ─────────────────────────────────────────────────── */}
        {modalState === "ready" && (
          <div className="px-6 py-4 border-t border-border/50 shrink-0 flex items-center justify-between bg-muted/10">
            <p className="text-xs text-muted-foreground">
              Prescription will be saved with the bill
            </p>
            <Button size="sm" onClick={onClose} className="gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
