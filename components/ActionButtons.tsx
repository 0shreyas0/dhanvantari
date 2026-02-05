import { Button } from "@/components/ui/button";
import { Plus, ScanBarcode } from "lucide-react";

export default function ActionButtons() {
    return (
      <div className="flex gap-3 mb-6">
        <Button className="gap-2 shadow-sm">
            <ScanBarcode className="w-4 h-4" />
            Scan Barcode
        </Button>
        <Button variant="outline" className="gap-2 shadow-sm">
            <Plus className="w-4 h-4" />
            Add Manual Entry
        </Button>
      </div>
    );
  }
