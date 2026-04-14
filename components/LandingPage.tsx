import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  ArrowRight, ShieldCheck, Zap, BarChart3,
  ScanBarcode, Clock, PackageCheck, Pill,
  ChevronRight, Star, TrendingUp, Bell
} from "lucide-react";
import Image from "next/image";
import { WipeToggler } from "./WipeToggler";

const features = [
  {
    icon: ScanBarcode,
    color: "from-blue-500 to-cyan-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    title: "Barcode-First Inventory",
    desc: "Scan any barcode to instantly add or look up medicine stock. Auto-generate EAN-13 codes for unlabelled products."
  },
  {
    icon: Clock,
    color: "from-amber-500 to-orange-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    title: "Expiry Intelligence",
    desc: "Real-time FEFO tracking with configurable warning tiers — Critical, Urgent, and Early. Never sell an expired medicine again."
  },
  {
    icon: BarChart3,
    color: "from-violet-500 to-purple-400",
    bg: "bg-violet-500/10",
    border: "border-violet-500/20",
    title: "Financial Insights",
    desc: "Track revenue, expired losses, and recalled stock. Know your exact profit margin on every batch sold."
  },
  {
    icon: PackageCheck,
    color: "from-emerald-500 to-green-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    title: "Batch Management",
    desc: "Multi-batch support per medicine with individual recall, stock, and pricing controls. Full audit trail."
  },
  {
    icon: Bell,
    color: "from-rose-500 to-pink-400",
    bg: "bg-rose-500/10",
    border: "border-rose-500/20",
    title: "Smart Alerts",
    desc: "Proactive dashboard alerts for low stock, near-expiry, and recalled batches. Stay ahead of every issue."
  },
  {
    icon: Zap,
    color: "from-sky-500 to-indigo-400",
    bg: "bg-sky-500/10",
    border: "border-sky-500/20",
    title: "Instant Billing",
    desc: "Generate bills in seconds. Send digital receipts via WhatsApp or Email with a single click. With PDF download."
  },
];

const stats = [
  { value: "< 100ms", label: "Search Speed" },
  { value: "FEFO", label: "Smart Stock Logic" },
  { value: "EAN-13", label: "Auto Barcode Gen" },
  { value: "100%", label: "Cloud Synced" },
];

const steps = [
  { num: "01", title: "Add Your Medicines", desc: "Import from CSV/Google Sheets or add individually. Barcodes are auto-generated." },
  { num: "02", title: "Track Batches & Expiry", desc: "Each batch has its own expiry date, unit cost, and stock level. The system alerts you automatically." },
  { num: "03", title: "Bill with Confidence", desc: "FEFO logic ensures you always sell the oldest stock first. Generate and share receipts instantly." },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#080810] text-white overflow-x-hidden">

      {/* ── Navbar ── */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#080810]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative h-9 w-9 overflow-hidden rounded-xl border border-white/10 shadow-lg shadow-primary/20">
              <Image src="/logo.png" alt="Dhanvantari Logo" fill className="object-cover" />
            </div>
            <div>
              <p className="text-sm font-bold tracking-tight leading-tight text-white">Dhanvantari</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <WipeToggler />
            <Link href="/sign-in">
              <Button variant="ghost" size="sm" className="text-white/60 hover:text-white hover:bg-white/5">
                Sign In
              </Button>
            </Link>
            <Link href="/sign-up">
              <Button size="sm" className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/25">
                Get Started <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative pt-24 pb-20 overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[400px] bg-primary/15 blur-[120px] rounded-full" />
          <div className="absolute top-32 left-1/4 w-[300px] h-[300px] bg-violet-600/10 blur-[80px] rounded-full" />
          <div className="absolute top-16 right-1/4 w-[250px] h-[250px] bg-cyan-500/10 blur-[80px] rounded-full" />
          {/* Grid lines */}
          <div className="absolute inset-0 opacity-[0.03]"
            style={{ backgroundImage: 'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)', backgroundSize: '60px 60px' }}
          />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-semibold mb-8">
            <Pill className="h-3 w-3" />
            Built for Indian Pharmacies
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.05] mb-6">
            <span className="text-white">The Smarter Way</span>
            <br />
            <span className="bg-gradient-to-r from-primary via-purple-400 to-cyan-400 bg-clip-text text-transparent">
              to Run a Pharmacy
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-lg text-white/50 leading-relaxed mb-10">
            Dhanvantari replaces your spreadsheet chaos with intelligent inventory tracking,
            automatic barcode generation, and one-click digital billing — all in a single, beautiful OS.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link href="/sign-up">
              <Button size="lg" className="h-13 px-8 text-base bg-primary hover:bg-primary/90 shadow-2xl shadow-primary/30">
                Start Free — No Credit Card
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/sign-in">
              <Button size="lg" variant="ghost" className="h-13 px-8 text-base text-white/60 hover:text-white hover:bg-white/5 border border-white/10">
                Sign In to Dashboard
              </Button>
            </Link>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/5 rounded-2xl border border-white/5 overflow-hidden max-w-3xl mx-auto">
            {stats.map((s) => (
              <div key={s.label} className="bg-[#080810] px-6 py-5 text-center">
                <p className="text-2xl font-black text-white mb-1">{s.value}</p>
                <p className="text-xs text-white/35 font-medium uppercase tracking-wider">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-24 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <p className="text-xs uppercase tracking-[0.2em] font-bold text-primary mb-3">Everything You Need</p>
            <h2 className="text-4xl font-black text-white mb-4">Built for the real pharmacy floor</h2>
            <p className="text-white/40 max-w-xl mx-auto">
              Not a generic inventory tool. Every feature is designed specifically for how a pharmacy actually works.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f) => (
              <div
                key={f.title}
                className={`group relative rounded-2xl border ${f.border} ${f.bg} p-6 hover:border-white/20 transition-all duration-300 hover:-translate-y-1`}
              >
                <div className={`inline-flex items-center justify-center h-11 w-11 rounded-xl bg-gradient-to-br ${f.color} bg-opacity-10 mb-5 shadow-lg`}>
                  <f.icon className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-white/40 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it Works ── */}
      <section className="py-24 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <p className="text-xs uppercase tracking-[0.2em] font-bold text-emerald-400 mb-3">Simple Setup</p>
            <h2 className="text-4xl font-black text-white mb-4">Up and running in minutes</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connector line */}
            <div className="hidden md:block absolute top-8 left-[calc(16.67%+2rem)] right-[calc(16.67%+2rem)] h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

            {steps.map((step) => (
              <div key={step.num} className="text-center relative">
                <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-white/5 border border-white/10 text-2xl font-black text-white/20 mb-5 mx-auto">
                  {step.num}
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{step.title}</h3>
                <p className="text-sm text-white/40 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="relative rounded-3xl overflow-hidden border border-primary/20 bg-gradient-to-br from-primary/10 via-violet-500/5 to-cyan-500/5 p-12 text-center">
            <div className="absolute inset-0 -z-10">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/50 text-xs font-medium mb-6">
              <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
              Free for individual pharmacists
            </div>

            <h2 className="text-4xl font-black text-white mb-4">
              Upgrade your inventory today.
            </h2>
            <p className="text-white/40 mb-8 max-w-lg mx-auto">
              Join pharmacies that have already digitized their operations with Dhanvantari.
              No spreadsheets. No guesswork.
            </p>
            <Link href="/sign-up">
              <Button size="lg" className="px-10 h-13 text-base bg-white text-[#080810] hover:bg-white/90 font-bold shadow-2xl">
                Create Your Free Account
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/5 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative h-7 w-7 overflow-hidden rounded-lg border border-white/10">
              <Image src="/logo.png" alt="Dhanvantari" fill className="object-cover" />
            </div>
            <span className="text-sm font-bold text-white/70">Dhanvantari</span>
          </div>
          <p className="text-xs text-white/25">
            &copy; 2026 Dhanvantari. All rights reserved.
          </p>
          <div className="flex items-center gap-6 text-xs text-white/30">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              Secured by Clerk
            </span>
            <span className="flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-primary" />
              Hosted on Vercel
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
