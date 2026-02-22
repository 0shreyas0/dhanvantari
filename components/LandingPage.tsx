import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, ShieldCheck, Zap, BarChart3, Pill } from "lucide-react";
import { ThemeProvider } from "@/components/theme-provider";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="container flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Pill className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold tracking-tight">Pharmacy OS</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/sign-in">
              <Button variant="ghost" size="sm">
                Sign In
              </Button>
            </Link>
            <Link href="/sign-up">
              <Button size="sm" className="hidden sm:flex">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-16 md:pt-24 lg:pt-32">
          <div className="container px-4 md:px-6 max-w-7xl mx-auto">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none bg-clip-text text-transparent bg-linear-to-r from-primary via-purple-500 to-indigo-600 animate-gradient">
                  Next-Gen Pharmacy Management
                </h1>
                <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl">
                  Streamline your inventory, track expiry dates with precision, and manage prescriptions effortlessly. 
                  The modern OS for modern pharmacies.
                </p>
              </div>
              <div className="flex flex-col gap-2 min-[400px]:flex-row pt-4">
                <Link href="/sign-up">
                  <Button size="lg" className="h-12 px-8 text-base">
                    Start Your Free Trial
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link href="#">
                  <Button variant="outline" size="lg" className="h-12 px-8 text-base">
                    View Demo
                  </Button>
                </Link>
              </div>
            </div>
          </div>
          
          {/* Abstract Background Elements */}
          <div className="absolute top-0 -z-10 h-full w-full overflow-hidden opacity-20 dark:opacity-10">
            <div className="absolute -top-[20%] -left-[10%] h-[500px] w-[500px] rounded-full bg-purple-500 blur-[120px]" />
            <div className="absolute top-[30%] -right-[10%] h-[400px] w-[400px] rounded-full bg-blue-500 blur-[100px]" />
          </div>
        </section>

        {/* Features Grid */}
        <section className="container px-4 py-12 md:py-24 lg:py-32 max-w-7xl mx-auto">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <div className="group relative overflow-hidden rounded-2xl border bg-card p-6 shadow-sm transition-all hover:shadow-md">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400">
                <Zap className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-xl font-bold">Lightning Fast</h3>
              <p className="text-muted-foreground">
                Optimized for speed. Search thousands of medicines in milliseconds with our advanced indexing engine.
              </p>
            </div>
            <div className="group relative overflow-hidden rounded-2xl border bg-card p-6 shadow-sm transition-all hover:shadow-md">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                <BarChart3 className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-xl font-bold">Smart Analytics</h3>
              <p className="text-muted-foreground">
                Gain insights into your top-selling products, expiry alerts, and stock trends with beautiful dashboards.
              </p>
            </div>
            <div className="group relative overflow-hidden rounded-2xl border bg-card p-6 shadow-sm transition-all hover:shadow-md">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-xl font-bold">Secure & Reliable</h3>
              <p className="text-muted-foreground">
                Enterprise-grade security for your data using Clerk authentication and robust database backups.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t bg-muted/30">
        <div className="container flex flex-col items-center justify-between gap-4 py-10 md:h-24 md:flex-row md:py-0 max-w-7xl mx-auto px-4">
          <div className="flex flex-col items-center gap-4 px-8 md:flex-row md:gap-2 md:px-0">
            <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
              &copy; 2024 Pharmacy OS. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
