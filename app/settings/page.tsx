"use client"

import { useState, useEffect } from "react"
import PageContainer from "@/components/PageContainer"
import MainLayout from "@/components/MainLayout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Loader2, Save, Store, Clock, Upload } from "lucide-react"
import { getPharmacySettings, updatePharmacySettings, getExpirySettings, updateExpirySettings } from "@/actions/settings"
import { toast } from "sonner"

export default function SettingsPage() {
  // ── Pharmacy settings ────────────────────────────────────────────────────────
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [formData, setFormData] = useState({ name: "My Pharmacy", phone: "", address: "", logoUrl: "" })

  // ── Expiry settings ──────────────────────────────────────────────────────────
  const [isExpiryLoading, setIsExpiryLoading] = useState(true)
  const [isExpirySaving, setIsExpirySaving] = useState(false)
  const [expiryForm, setExpiryForm] = useState({
    earlyWarningDays:  90,
    urgentWarningDays: 30,
    criticalDays:       7,
  })
  const [expiryErrors, setExpiryErrors] = useState<{ [k: string]: string }>({})

  useEffect(() => {
    async function load() {
      try {
        const [settings, expiry] = await Promise.all([getPharmacySettings(), getExpirySettings()])
        if (settings) {
          setFormData({ 
            name: settings.name || "My Pharmacy", 
            phone: settings.phone || "", 
            address: settings.address || "",
            logoUrl: settings.logoUrl || ""
          })
        }
        if (expiry) {
          setExpiryForm({
            earlyWarningDays:  expiry.earlyWarningDays,
            urgentWarningDays: expiry.urgentWarningDays,
            criticalDays:      expiry.criticalDays,
          })
        }
      } catch (err) {
        console.error(err)
      } finally {
        setIsLoading(false)
        setIsExpiryLoading(false)
      }
    }
    load()
  }, [])

  // ── Pharmacy form ────────────────────────────────────────────────────────────
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    const formData = new FormData()
    formData.append("logo", file)

    try {
      const res = await fetch("/api/settings/logo", {
        method: "POST",
        body: formData,
      })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || "Upload failed")
      }
      const data = await res.json()
      if (data.logoUrl || data.url) {
        setFormData(prev => ({ ...prev, logoUrl: data.logoUrl ?? data.url }))
        toast.success("Logo uploaded and staging — save to persist!")
      }
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || "Failed to upload image.")
    } finally {
      setIsUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      await updatePharmacySettings(formData)
      toast.success("Settings saved successfully!")
    } catch (err) {
      console.error(err)
      toast.error("Failed to save settings.")
    } finally {
      setIsSaving(false)
    }
  }

  // ── Expiry form ──────────────────────────────────────────────────────────────
  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setExpiryForm(prev => ({ ...prev, [name]: Number(value) }))
    setExpiryErrors({})  // Clear errors on type
  }

  const validateExpiry = (): boolean => {
    const errors: { [k: string]: string } = {}
    const { criticalDays, urgentWarningDays, earlyWarningDays } = expiryForm

    if (criticalDays <= 0) errors.criticalDays = "Must be greater than 0"
    if (urgentWarningDays <= 0) errors.urgentWarningDays = "Must be greater than 0"
    if (earlyWarningDays <= 0) errors.earlyWarningDays = "Must be greater than 0"

    if (criticalDays >= urgentWarningDays) {
      errors.criticalDays = "Critical must be less than Urgent"
    }
    if (urgentWarningDays >= earlyWarningDays) {
      errors.urgentWarningDays = "Urgent must be less than Early Warning"
    }

    setExpiryErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleExpirySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateExpiry()) return

    setIsExpirySaving(true)
    try {
      await updateExpirySettings(expiryForm)
      toast.success("Expiry thresholds saved!")
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || "Failed to save expiry settings.")
    } finally {
      setIsExpirySaving(false)
    }
  }

  return (
    <PageContainer>
      <MainLayout>
        <div className="mb-8 flex items-center gap-3">
          <Store className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Pharmacy Settings</h1>
            <p className="text-muted-foreground mt-1">Configure your store identity and expiry thresholds.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
          {/* ── Basic Information ──────────────────────────────────────────────── */}
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                Your pharmacy branding and identity for receipts.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              {isLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex flex-col h-full space-y-6">
                  <div className="flex-1 space-y-6">
                    <div className="space-y-4 pt-2">
                       <div className="flex items-center gap-4">
                          <div className="h-16 w-16 rounded-xl border-2 border-dashed border-border/60 bg-muted/30 flex items-center justify-center overflow-hidden shrink-0">
                             {formData.logoUrl ? (
                               <img src={formData.logoUrl} alt="Store Logo" className="h-full w-full object-contain" />
                             ) : (
                               <Store className="h-8 w-8 text-muted-foreground opacity-30" />
                             )}
                          </div>
                          <div className="space-y-1.5 flex-1">
                             <Label>Pharmacy Logo</Label>
                             <div className="flex items-center gap-3">
                               <div className="relative">
                                 <input
                                   type="file"
                                   id="logo-upload"
                                   className="hidden"
                                   accept="image/*"
                                   onChange={handleFileUpload}
                                 />
                                 <Button 
                                   type="button" 
                                   variant="outline" 
                                   size="sm" 
                                   className="h-9"
                                   disabled={isUploading}
                                   onClick={() => document.getElementById("logo-upload")?.click()}
                                 >
                                   {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                                   {isUploading ? "Uploading..." : "Upload New Logo"}
                                 </Button>
                               </div>
                               {formData.logoUrl && (
                                 <Button
                                   type="button"
                                   variant="ghost"
                                   size="sm"
                                   className="h-9 text-destructive hover:text-destructive hover:bg-destructive/10"
                                   onClick={() => setFormData(prev => ({ ...prev, logoUrl: "" }))}
                                 >
                                   Remove
                                 </Button>
                               )}
                             </div>
                             <p className="text-[10px] text-muted-foreground">Upload your store logo. It will be stored securely in Supabase Storage.</p>
                          </div>
                       </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="name">Pharmacy Name</Label>
                      <Input id="name" name="name" value={formData.name} onChange={handleChange} placeholder="e.g. New Bhavani Medical" required />
                      <p className="text-xs text-muted-foreground">This name appears at the top of every bill.</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number (Optional)</Label>
                      <Input id="phone" name="phone" value={formData.phone} onChange={handleChange} placeholder="e.g. 9876543210" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="address">Address line (Optional)</Label>
                      <Input id="address" name="address" value={formData.address} onChange={handleChange} placeholder="e.g. Andheri East, Mumbai" />
                    </div>
                  </div>
                  <Button type="submit" className="w-full shrink-0" disabled={isSaving}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    {isSaving ? "Saving..." : "Save Settings"}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

          {/* ── Expiry Warning Thresholds ──────────────────────────────────────── */}
          <Card className="flex flex-col">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle>Expiry Warning Thresholds</CardTitle>
                  <CardDescription className="mt-1">
                    Control when medicines appear in the expiry alert tiers.
                    <br />
                    Must satisfy: <span className="font-mono text-xs">Critical &lt; Urgent &lt; Early</span>
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              {isExpiryLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                  <form onSubmit={handleExpirySubmit} className="flex flex-col h-full space-y-6">
                    <div className="flex-1 space-y-6">
                      {/* Early Warning */}
                      <div className="space-y-2">
                        <Label htmlFor="earlyWarningDays" className="flex items-center gap-2">
                          <span className="text-base">🟡</span> Early Warning (days)
                        </Label>
                        <Input
                          id="earlyWarningDays"
                          name="earlyWarningDays"
                          type="number"
                          min={1}
                          max={365}
                          value={expiryForm.earlyWarningDays}
                          onChange={handleExpiryChange}
                          className={expiryErrors.earlyWarningDays ? "border-destructive" : ""}
                        />
                        {expiryErrors.earlyWarningDays && (
                          <p className="text-xs text-destructive">{expiryErrors.earlyWarningDays}</p>
                        )}
                        <p className="text-xs text-muted-foreground">Yellow badge — first notice that expiry is approaching.</p>
                      </div>

                      {/* Urgent Warning */}
                      <div className="space-y-2">
                        <Label htmlFor="urgentWarningDays" className="flex items-center gap-2">
                          <span className="text-base">🟠</span> Urgent Warning (days)
                        </Label>
                        <Input
                          id="urgentWarningDays"
                          name="urgentWarningDays"
                          type="number"
                          min={1}
                          max={365}
                          value={expiryForm.urgentWarningDays}
                          onChange={handleExpiryChange}
                          className={expiryErrors.urgentWarningDays ? "border-destructive" : ""}
                        />
                        {expiryErrors.urgentWarningDays && (
                          <p className="text-xs text-destructive">{expiryErrors.urgentWarningDays}</p>
                        )}
                        <p className="text-xs text-muted-foreground">Orange badge — action should be taken soon.</p>
                      </div>

                      {/* Critical */}
                      <div className="space-y-2">
                        <Label htmlFor="criticalDays" className="flex items-center gap-2">
                          <span className="text-base">🔴</span> Critical (days)
                        </Label>
                        <Input
                          id="criticalDays"
                          name="criticalDays"
                          type="number"
                          min={1}
                          max={365}
                          value={expiryForm.criticalDays}
                          onChange={handleExpiryChange}
                          className={expiryErrors.criticalDays ? "border-destructive" : ""}
                        />
                        {expiryErrors.criticalDays && (
                          <p className="text-xs text-destructive">{expiryErrors.criticalDays}</p>
                        )}
                        <p className="text-xs text-muted-foreground">Red badge + billing confirmation dialog triggered.</p>
                      </div>
                    </div>

                    <Button type="submit" className="w-full shrink-0" disabled={isExpirySaving}>
                      {isExpirySaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      {isExpirySaving ? "Saving..." : "Save Thresholds"}
                    </Button>
                  </form>
              )}
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    </PageContainer>
  )
}
