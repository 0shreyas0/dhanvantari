"use client"

import { useState, useEffect } from "react"
import PageContainer from "@/components/PageContainer"
import MainLayout from "@/components/MainLayout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Loader2, Save, Store } from "lucide-react"
import { getPharmacySettings, updatePharmacySettings } from "@/actions/settings"
import { toast } from "sonner"

export default function SettingsPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: "My Pharmacy",
    phone: "",
    address: ""
  })

  useEffect(() => {
    async function loadSettings() {
      try {
        const settings = await getPharmacySettings()
        if (settings) {
            setFormData({
                name: settings.name || "My Pharmacy",
                phone: settings.phone || "",
                address: settings.address || ""
            })
        }
      } catch (err) {
        console.error(err)
      } finally {
        setIsLoading(false)
      }
    }
    loadSettings()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
        await updatePharmacySettings(formData);
        toast.success("Settings saved successfully!");
    } catch (err) {
        console.error(err);
        toast.error("Failed to save settings.");
    } finally {
        setIsSaving(false);
    }
  }

  return (
    <PageContainer>
      <MainLayout>
        <div className="mb-8 flex items-center gap-3">
          <Store className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Pharmacy Settings</h1>
            <p className="text-muted-foreground mt-1">Configure your store identity and sticker printing presets.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card>
                <CardHeader>
                    <CardTitle>Basic Information</CardTitle>
                    <CardDescription>
                        This information will be printed on your thermal barcode stickers.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex items-center justify-center p-8">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="name">Pharmacy Name</Label>
                                <Input 
                                    id="name" 
                                    name="name" 
                                    value={formData.name} 
                                    onChange={handleChange} 
                                    placeholder="e.g. New Bhavani Medical"
                                    required
                                />
                                <p className="text-xs text-muted-foreground">Keep it short so it fits on a 2-inch sticker.</p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="phone">Phone Number (Optional)</Label>
                                <Input 
                                    id="phone" 
                                    name="phone" 
                                    value={formData.phone} 
                                    onChange={handleChange} 
                                    placeholder="e.g. 9876543210"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="address">Address line (Optional)</Label>
                                <Input 
                                    id="address" 
                                    name="address" 
                                    value={formData.address} 
                                    onChange={handleChange} 
                                    placeholder="e.g. Andheri East, Mumbai"
                                />
                            </div>

                            <Button type="submit" className="w-full" disabled={isSaving}>
                                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                {isSaving ? "Saving..." : "Save Settings"}
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
