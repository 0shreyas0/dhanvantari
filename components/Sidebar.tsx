"use client";

import { CreditCard, LayoutGrid, Package, Pill, Users, Settings, Receipt } from "lucide-react";
import Link from 'next/link';
import Image from "next/image";
import { usePathname } from "next/navigation";
import { WipeToggler } from "./WipeToggler";
import { UserButton } from "@clerk/nextjs";
import { motion } from "framer-motion";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutGrid },
  { href: "/finance", label: "Finance", icon: Receipt },
  { href: "/products", label: "Products", icon: Package },
  { href: "/billing", label: "Billing", icon: CreditCard },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-50 h-screen w-64 border-r border-border bg-card/80 backdrop-blur-md supports-backdrop-filter:bg-card/60 hidden md:flex md:flex-col">
      {/* Logo Section */}
      <div className="flex items-center gap-3 h-16 px-6 border-b border-border/50 shrink-0">
        <div className="relative h-10 w-10 overflow-hidden rounded-xl shadow-sm shadow-primary/20 shrink-0">
          <Image 
            src="/logo.png" 
            alt="Dhanvantari Logo" 
            fill
            className="object-cover"
          />
        </div>
        <div className="flex flex-col justify-center">
          <h1 className="text-lg font-bold tracking-tight text-foreground leading-tight">Dhanvantari</h1>
          <p className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground leading-tight">Inventory System</p>
        </div>
      </div>

      {/* Navigation Tabs (Vertical) */}
      <nav className="flex flex-col gap-1 p-4 flex-1 overflow-y-auto">
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
              className={`relative flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all duration-200 z-10 ${isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-pill"
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

      {/* User Section at the bottom */}
      <div className="flex flex-col gap-4 p-4 border-t border-border/50 shrink-0">
        <div className="flex items-center justify-between px-2">
          <span className="text-sm font-medium text-muted-foreground">Theme</span>
          <WipeToggler />
        </div>
        <div className="flex items-center w-full rounded-lg hover:bg-muted/50 transition-colors p-2">
          <UserButton 
            showName
            appearance={{
              elements: {
                userButtonBox: "flex flex-row w-full",
                userButtonOuterIdentifier: "text-sm font-medium !text-foreground ml-2",
              }
            }}
          />
        </div>
      </div>
    </aside>
  );
}
