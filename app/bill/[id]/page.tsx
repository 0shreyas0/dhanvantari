import { getBillDetails } from "@/actions/inventory"
import { getSignedPdfUrl } from "@/lib/pdf-token"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2, FileText, Smartphone } from "lucide-react"
import Link from "next/link"

export default async function PublicBillPage({ params }: { params: { id: string } }) {
  const bill = await getBillDetails(params.id)
  const pdfUrl = bill ? getSignedPdfUrl(params.id) : null

  if (!bill) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <h1 className="text-xl font-semibold">Bill Not Found</h1>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/20 pb-20 pt-10 px-4 flex flex-col items-center">
      {/* Platform Branding */}
      <div className="flex items-center gap-2 mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
        <div className="bg-primary/10 p-2 rounded-lg">
           <Smartphone className="h-6 w-6 text-primary" />
        </div>
        <div className="text-left font-serif">
           <span className="text-sm font-bold block leading-none">Powered by</span>
           <span className="text-xl font-black text-sky-600">Dhanvantari</span>
        </div>
      </div>

      <Card className="w-full max-w-2xl border-border/40 shadow-xl rounded-2xl overflow-hidden backdrop-blur-sm bg-background/95">
        <div className="h-2 bg-primary w-full" />
        <CardHeader className="text-center pb-2 border-b border-border/40 bg-muted/10">
          <Badge variant="outline" className="w-fit mx-auto mb-4 bg-green-500/10 text-green-600 border-green-500/20">
            Official E-Receipt
          </Badge>
          <CardTitle className="text-3xl font-black tracking-tight uppercase">
            {bill.pharmacyName}
          </CardTitle>
          <p className="text-muted-foreground text-sm uppercase tracking-widest mt-1">
            Tax Invoice & Sale Confirmation
          </p>
        </CardHeader>

        <CardContent className="p-8">
          <div className="flex flex-col sm:flex-row justify-between gap-6 mb-10 pb-10 border-b border-dashed border-border/60">
            <div>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-1">Bill Issued To</p>
              <h3 className="text-xl font-bold">{bill.customerName || "Valued Customer"}</h3>
              <p className="text-sm text-muted-foreground">{bill.customerPhone || "Digital Copy Only"}</p>
            </div>
            <div className="sm:text-right">
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-1">Receipt Number</p>
              <h3 className="font-mono text-lg font-bold">#${bill.id.slice(-8).toUpperCase()}</h3>
              <p className="text-sm text-muted-foreground">
                {new Date(bill.createdAt).toLocaleDateString(undefined, {
                  year: 'numeric', month: 'long', day: 'numeric'
                })}
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <h4 className="flex items-center gap-2 font-bold mb-4 uppercase tracking-tighter text-sm">
                <FileText className="h-4 w-4" />
                Items Purchased
            </h4>
            <div className="space-y-4">
              {bill.items.map((item: any) => (
                <div key={item.id} className="flex justify-between items-center group">
                  <div className="flex-1">
                    <p className="font-bold text-sm">{item.medicine.name}</p>
                    <p className="text-xs text-muted-foreground">Quantity: {item.quantity} units</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">₹{(item.price * item.quantity).toFixed(2)}</p>
                    <p className="text-[10px] text-muted-foreground italic">₹{item.price.toFixed(2)} each</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-10 pt-10 border-t-2 border-muted">
              <div className="flex justify-between items-end mb-8">
                <div>
                   <h2 className="text-4xl font-black text-primary">₹{bill.totalAmount.toFixed(2)}</h2>
                   <p className="text-[10px] text-muted-foreground font-black uppercase mt-1">Total Net Amount Paid</p>
                </div>
                <div className="flex flex-col items-end">
                   <div className="flex items-center gap-1 text-green-600 font-bold text-sm mb-1">
                      <CheckCircle2 className="h-4 w-4" />
                      Payment Verified
                   </div>
                   <p className="text-xs text-muted-foreground italic">Powered by Dhanvantari</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
             <Link 
                href={pdfUrl!}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 bg-primary text-primary-foreground py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg hover:shadow-primary/20 transition-all active:scale-[0.98]"
             >
                <FileText className="h-5 w-5" />
                Download PDF Receipt
             </Link>
          </div>
        </CardContent>
      </Card>
      
      <p className="mt-8 text-muted-foreground text-xs text-center max-w-sm">
        This is a computer-generated document and is a valid electronic record under the Information Technology Act.
      </p>
    </div>
  )
}
