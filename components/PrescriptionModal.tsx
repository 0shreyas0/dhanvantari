"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useUploadThing } from "@/lib/uploadthing"
import { searchProducts } from "@/actions/inventory"
import { extractMedicinesFromPrescription, type ExtractedMedicine } from "@/actions/prescription-ocr"
import {
  Loader2,
  Search,
  Plus,
  FileText,
  ImageUp,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Trash2,
  PackageX,
  Sparkles,
  RefreshCw,
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

interface MedicineResult {
  extracted: ExtractedMedicine
  matches: Product[]
  searched: boolean
}

interface PrescriptionModalProps {
  open: boolean
  onClose: () => void
  prescriptionUrl: string | null
  onPrescriptionUploaded: (url: string) => void
  onPrescriptionRemoved: () => void
  onAddToBill: (product: Product) => void
  billItemIds: Set<string>
}

type ModalState = "idle" | "uploading" | "scanning" | "ready"

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

  // OCR results
  const [medicineResults, setMedicineResults] = useState<MedicineResult[]>([])
  const [ocrError, setOcrError] = useState<string | null>(null)

  // Manual fallback search
  const [manualQuery, setManualQuery] = useState("")
  const [manualResults, setManualResults] = useState<Product[]>([])
  const [isManualSearching, setIsManualSearching] = useState(false)
  const [hasManualSearched, setHasManualSearched] = useState(false)
  const [showManualSearch, setShowManualSearch] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // When modal opens with existing URL, go straight to ready
  useEffect(() => {
    if (open && prescriptionUrl && modalState === "idle") {
      setModalState("ready")
    }
  }, [open, prescriptionUrl])

  // Reset when modal closes
  useEffect(() => {
    if (!open) {
      setManualQuery("")
      setManualResults([])
      setHasManualSearched(false)
      setShowManualSearch(false)
    }
  }, [open])

  const { startUpload } = useUploadThing("prescriptionUpload", {
    onUploadBegin: () => {
      setModalState("uploading")
      setUploadProgress(10)
    },
    onUploadProgress: (p) => setUploadProgress(p),
    onClientUploadComplete: async (res) => {
      const url = res?.[0]?.ufsUrl
      if (url) {
        onPrescriptionUploaded(url)
        setUploadProgress(100)
        // Immediately kick off OCR
        await runOcr(url)
      }
    },
    onUploadError: (err) => {
      setModalState("idle")
      setUploadProgress(0)
      toast.error(err.message || "Upload failed — please try again")
    },
  })

  const runOcr = async (url: string) => {
    setModalState("scanning")
    setOcrError(null)
    setMedicineResults([])

    const ocrResult = await extractMedicinesFromPrescription(url)

    if (!ocrResult.success || ocrResult.medicines.length === 0) {
      setOcrError(ocrResult.error ?? "No medicines detected. Use manual search below.")
      setShowManualSearch(true)
      setModalState("ready")
      return
    }

    // For each extracted medicine, search inventory
    const results: MedicineResult[] = await Promise.all(
      ocrResult.medicines.map(async (med) => {
        const matches = await searchProducts(med.name)
        return { extracted: med, matches: matches as Product[], searched: true }
      })
    )

    setMedicineResults(results)
    setModalState("ready")

    const foundCount = results.filter(r => r.matches.length > 0).length
    if (foundCount > 0) {
      toast.success(`Found ${foundCount} of ${results.length} medicines in your inventory`)
    } else {
      toast.info("Medicines detected but none found in inventory — check spelling or add them first")
    }
  }

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
    setMedicineResults([])
    setOcrError(null)
    setShowManualSearch(false)
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

  const handleManualSearch = async (q: string) => {
    setManualQuery(q)
    if (!q.trim()) { setManualResults([]); setHasManualSearched(false); return }
    setIsManualSearching(true)
    setHasManualSearched(true)
    try {
      const r = await searchProducts(q.trim())
      setManualResults(r as Product[])
    } catch {
      toast.error("Search failed")
    } finally {
      setIsManualSearching(false)
    }
  }

  const handleRemove = () => {
    onPrescriptionRemoved()
    setModalState("idle")
    setMedicineResults([])
    setOcrError(null)
    setManualQuery("")
    setManualResults([])
    setHasManualSearched(false)
    setShowManualSearch(false)
    setUploadProgress(0)
  }

  const isPdf = prescriptionUrl?.toLowerCase().includes("pdf") ||
    prescriptionUrl?.includes(".pdf")

  // ── Shared product card ──────────────────────────────────────────
  const ProductCard = ({ product, compact = false }: { product: Product; compact?: boolean }) => {
    const alreadyAdded = billItemIds.has(product.id)
    const outOfStock = product.stock === 0
    const isUnavailable = !!product.isExpired || outOfStock

    return (
      <div
        className={`flex items-center gap-3 ${compact ? "px-3 py-2" : "p-3"} rounded-lg border text-sm transition-colors ${
          isUnavailable
            ? "border-border/40 bg-muted/20 opacity-60"
            : alreadyAdded
            ? "border-green-500/30 bg-green-500/5"
            : "border-border/60 bg-card hover:bg-muted/40"
        }`}
      >
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
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{product.name}</p>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <span className="text-xs text-muted-foreground">₹{product.price} · Stock: {product.stock}</span>
            {product.isExpired && <span className="text-[10px] font-bold text-destructive bg-destructive/10 px-1.5 py-0.5 rounded">EXPIRED</span>}
            {outOfStock && !product.isExpired && <span className="text-[10px] font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">OUT OF STOCK</span>}
            {product.isExpiringSoon && !product.isExpired && <span className="text-[10px] font-bold text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded">EXPIRING SOON</span>}
          </div>
        </div>
        {alreadyAdded ? (
          <span className="text-[10px] font-semibold text-green-600 dark:text-green-400 shrink-0">Added ✓</span>
        ) : (
          <Button
            size="sm"
            variant={isUnavailable ? "ghost" : "outline"}
            className="h-7 px-2.5 shrink-0 gap-1"
            disabled={isUnavailable}
            onClick={() => onAddToBill(product)}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-border/50 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4 text-primary" />
            Attach Prescription
          </DialogTitle>
        </DialogHeader>

        {/* ── State: Idle ─────────────────────────────────────────── */}
        {modalState === "idle" && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 gap-6">
            <div
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
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
                <p className="text-xs text-muted-foreground mt-1.5">
                  Gemini AI will auto-detect medicines
                </p>
                <p className="text-[10px] text-muted-foreground/70 mt-1">
                  JPG, PNG, WEBP, PDF · max 8MB
                </p>
              </div>
            </div>
            <input ref={fileInputRef} type="file" className="hidden" accept="image/*,.pdf" onChange={handleInputChange} />
            <Button variant="ghost" className="text-muted-foreground" onClick={onClose}>Cancel</Button>
          </div>
        )}

        {/* ── State: Uploading ────────────────────────────────────── */}
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
              <div className="bg-primary h-full rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
            </div>
          </div>
        )}

        {/* ── State: Scanning (OCR) ───────────────────────────────── */}
        {modalState === "scanning" && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 gap-5">
            <div className="h-14 w-14 rounded-full bg-violet-500/10 flex items-center justify-center">
              <Sparkles className="h-7 w-7 text-violet-500 animate-pulse" />
            </div>
            <div className="text-center">
              <p className="font-medium text-sm">Analysing prescription…</p>
              <p className="text-xs text-muted-foreground mt-1">Gemini AI is reading medicine names</p>
            </div>
            <div className="flex gap-1 mt-2">
              {[0, 1, 2].map(i => (
                <div key={i} className="h-2 w-2 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </div>
        )}

        {/* ── State: Ready ────────────────────────────────────────── */}
        {modalState === "ready" && prescriptionUrl && (
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 overflow-hidden min-h-0">

            {/* Left: Image preview */}
            <div className="flex flex-col border-r border-border/50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/30 shrink-0">
                <span className="text-xs font-medium text-muted-foreground">Prescription</span>
                <a href={prescriptionUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
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
                  <img src={prescriptionUrl} alt="Prescription" className="max-h-full max-w-full object-contain rounded-lg shadow" />
                )}
              </div>
              <div className="px-4 py-3 shrink-0 border-t border-border/30 flex items-center justify-between">
                <button onClick={handleRemove} className="flex items-center gap-1.5 text-xs text-destructive hover:opacity-70 transition-opacity">
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove
                </button>
                <button onClick={() => runOcr(prescriptionUrl)} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <RefreshCw className="h-3.5 w-3.5" />
                  Re-scan
                </button>
              </div>
            </div>

            {/* Right: OCR results + manual search */}
            <div className="flex flex-col overflow-hidden">
              <div className="px-4 py-2.5 border-b border-border/30 shrink-0 flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-violet-500" />
                <p className="text-xs font-medium">AI-detected medicines</p>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">

                {/* OCR error state */}
                {ocrError && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <span>{ocrError}</span>
                  </div>
                )}

                {/* OCR medicine results */}
                {medicineResults.map((result, i) => (
                  <div key={i} className="space-y-1.5">
                    {/* Raw prescription line */}
                    <p className="text-[10px] text-muted-foreground/70 font-mono pl-1 truncate" title={result.extracted.rawText}>
                      "{result.extracted.rawText}"
                    </p>

                    {result.matches.length > 0 ? (
                      result.matches.slice(0, 2).map(p => (
                        <ProductCard key={p.id} product={p} compact />
                      ))
                    ) : (
                      <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-border/40 bg-muted/20 text-xs text-muted-foreground">
                        <PackageX className="h-4 w-4 shrink-0 opacity-50" />
                        <div>
                          <p className="font-medium text-foreground/70">"{result.extracted.name}" not in inventory</p>
                          <p className="text-[10px] mt-0.5">Add it to products first, or search below</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* Divider + manual search toggle */}
                <div className="pt-2">
                  {!showManualSearch ? (
                    <button
                      onClick={() => setShowManualSearch(true)}
                      className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
                    >
                      + Search manually
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">Manual search</p>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                          {isManualSearching
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                            : <Search className="h-3.5 w-3.5 text-muted-foreground" />
                          }
                        </div>
                        <Input
                          placeholder="Type medicine name…"
                          value={manualQuery}
                          onChange={(e) => handleManualSearch(e.target.value)}
                          className="pl-8 h-8 text-xs"
                          autoFocus
                        />
                      </div>

                      {manualResults.map(p => <ProductCard key={p.id} product={p} compact />)}

                      {hasManualSearched && !isManualSearching && manualResults.length === 0 && (
                        <div className="flex flex-col items-center gap-1 py-4 text-center">
                          <PackageX className="h-6 w-6 text-muted-foreground opacity-40" />
                          <p className="text-xs text-muted-foreground">
                            "{manualQuery}" not found — add it to inventory first
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Footer ─────────────────────────────────────────────── */}
        {modalState === "ready" && (
          <div className="px-6 py-4 border-t border-border/50 shrink-0 flex items-center justify-between bg-muted/10">
            <p className="text-xs text-muted-foreground">Prescription saved with this bill</p>
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
