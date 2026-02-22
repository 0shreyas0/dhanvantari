"use client";

import { CreditCard, LayoutGrid, Package, Pill, Users } from "lucide-react";
import Link from 'next/link';
import Image from "next/image";
import { usePathname } from "next/navigation";
import { WipeToggler } from "./WipeToggler";
import { UserButton } from "@clerk/nextjs";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutGrid },
  { href: "/products", label: "Products", icon: Package },
  { href: "/billing", label: "Billing", icon: CreditCard },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-card/80 backdrop-blur-md supports-backdrop-filter:bg-card/60">
      <div className="flex h-16 items-center justify-between px-6">
        {/* Logo Section */}
        <div className="flex items-center gap-8">
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

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1">
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
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-primary hover:bg-muted/50 rounded-lg transition-all duration-200 data-[active=true]:bg-primary/10 data-[active=true]:text-primary"
                >
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
  );
}
