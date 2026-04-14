"use client";

import { CreditCard, LayoutGrid, Package, Pill, Users, Settings, Receipt, Menu, X } from "lucide-react";
import Link from 'next/link';
import Image from "next/image";
import { usePathname } from "next/navigation";
import { WipeToggler } from "./WipeToggler";
import { UserButton } from "@clerk/nextjs";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutGrid },
  { href: "/finance", label: "Finance", icon: Receipt },
  { href: "/products", label: "Products", icon: Package },
  { href: "/billing", label: "Billing", icon: CreditCard },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function Navbar() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-border bg-card/80 backdrop-blur-md supports-backdrop-filter:bg-card/60">
        <div className="relative flex h-16 items-center justify-between px-6">
          {/* Logo Section */}
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-10 overflow-hidden rounded-xl shadow-sm shadow-primary/20">
              <Image 
                src="/logo.png" 
                alt="Dhanvantari Logo" 
                fill
                className="object-cover"
              />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-foreground">Dhanvantari</h1>
              <p className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">Inventory System</p>
            </div>
          </div>

          {/* Navigation Tabs (Centered) */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden md:block">
            <nav className="flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = item.href === "/" 
                  ? pathname === "/"
                  : pathname?.startsWith(item.href);
                const Icon = item.icon;
                
                return (
                  <Link 
                    key={item.href}
                    href={item.href} 
                    data-active={isActive}
                    className={`relative flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all duration-200 z-10 ${isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="navbar-pill"
                        className="absolute inset-0 bg-primary/10 rounded-lg -z-10"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                    <Icon size={18} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* User Section */}
          <div className="flex items-center gap-4">
            <WipeToggler />
            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-accent transition-colors"
              aria-label="Toggle mobile menu"
            >
              {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div className="flex items-center gap-2">
              <UserButton 
                showName
                appearance={{
                  elements: {
                    userButtonBox: "flex flex-row-reverse",
                    userButtonOuterIdentifier: "text-sm font-medium !text-foreground",
                  }
                }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden bg-card/95 backdrop-blur-md border-b border-border"
          >
            <nav className="flex flex-col gap-1 p-4">
              {navItems.map((item) => {
                const isActive = item.href === "/" 
                  ? pathname === "/"
                  : pathname?.startsWith(item.href);
                const Icon = item.icon;
                
                return (
                  <Link 
                    key={item.href}
                    href={item.href} 
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-accent'}`}
                  >
                    <Icon size={18} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
