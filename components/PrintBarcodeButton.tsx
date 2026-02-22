"use client";

import { useRef } from "react";
import { useReactToPrint } from "react-to-print";
import Barcode from "react-barcode";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

interface PrintBarcodeButtonProps {
    medicineName: string;
    barcode: string;
    price: number;
}

export function PrintBarcodeButton({ medicineName, barcode, price }: PrintBarcodeButtonProps) {
  const componentRef = useRef<HTMLDivElement>(null);
  
  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: `Barcode-${barcode}`,
    pageStyle: `
      @page {
        size: 2in 1in;
        margin: 0;
      }
      @media print {
        body { 
          margin: 0;
          padding: 0;
          background: white !important;
        }
      }
    `
  });

  return (
    <>
      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => handlePrint()} title="Print Barcode Label">
        <Printer className="h-4 w-4" />
      </Button>
      
      {/* Hidden printable area. We use a wrapping div with display: none so it doesn't affect standard layout, but useReactToPrint can still access the ref's HTML. */}
      <div className="hidden">
        <div 
            ref={componentRef} 
            className="print:flex flex-col items-center justify-center bg-white text-black overflow-hidden"
            style={{ width: '2in', height: '1in', padding: '0.1in' }} 
        >
          <div className="text-[10px] font-bold truncate w-full text-center leading-tight mb-1 max-w-full">
            {medicineName}
          </div>
          
          <Barcode 
            value={barcode} 
            format="CODE128" 
            width={1.2} 
            height={25} 
            fontSize={10} 
            margin={0} 
            background="#ffffff" 
            lineColor="#000000" 
            displayValue={true}
          />
          
          <div className="text-[9px] font-semibold mt-1">
            ₹{price.toFixed(2)}
          </div>
        </div>
      </div>
    </>
  );
}
