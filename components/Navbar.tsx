import { WipeToggler } from "./WipeToggler";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-card/80 backdrop-blur-md supports-backdrop-filter:bg-card/60">
      <div className="flex h-16 items-center justify-between px-6">
        {/* Logo Section */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-sm shadow-primary/20">
            <span className="text-lg font-bold text-primary-foreground">P</span>
          </div>
          <div>
             <h1 className="text-lg font-bold tracking-tight text-foreground">Pharmacy OS</h1>
             <p className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">Inventory System</p>
          </div>
        </div>

        {/* User Section */}
        <div className="flex items-center gap-4">
          <WipeToggler />
          <div className="hidden text-right md:block">
            <p className="text-sm font-medium text-foreground">Dr. Smith</p>
            <p className="text-xs text-muted-foreground">Chief Pharmacist</p>
          </div>
          <Avatar>
            <AvatarImage src="/placeholder-avatar.jpg" />
            <AvatarFallback className="bg-primary text-primary-foreground font-medium">DS</AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  );
}
