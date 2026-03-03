"use client";

import { useRef } from "react";
import { useReactToPrint } from "react-to-print";
import Barcode from "react-barcode";
import { QRCodeCanvas } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Printer, QrCode } from "lucide-react";

interface PrintBarcodeButtonProps {
    pharmacyName: string;
    medicineName: string;
    barcode: string;
    price: number;
    batch: string;
}

export function PrintBarcodeButton({ pharmacyName, medicineName, barcode, price, batch }: PrintBarcodeButtonProps) {
  const barcodeRef = useRef<HTMLDivElement>(null);
  const qrRef = useRef<HTMLDivElement>(null);
  
  const handlePrintBarcode = useReactToPrint({
    contentRef: barcodeRef,
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

  const handlePrintQR = useReactToPrint({
    contentRef: qrRef,
    documentTitle: `QRCode-${barcode}`,
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

  const qrData = `Med: ${medicineName}\nBarcode: ${barcode}\nPrice: ₹${price.toFixed(2)}\nBatch: ${batch}`;

  return (
    <>
      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => handlePrintBarcode()} title="Print Barcode Label">
        <Printer className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => handlePrintQR()} title="Print QR Code Label">
        <QrCode className="h-4 w-4" />
      </Button>
      
      {/* Hidden printable area for Barcode */}
      <div className="hidden">
        <div 
            ref={barcodeRef} 
            className="print:flex flex-col items-center justify-center bg-white text-black overflow-hidden"
            style={{ width: '2in', height: '1in', padding: '0.05in', boxSizing: 'border-box' }} 
        >
          <div className="text-[7px] font-bold uppercase tracking-widest text-center text-gray-700 mb-0.5 max-w-full truncate">
            {pharmacyName}
          </div>
          <div className="text-[10px] font-bold truncate w-full text-center leading-tight mb-1 max-w-full">
            {medicineName}
          </div>
          
          <Barcode 
            value={barcode} 
            format="CODE128" 
            width={1.2} 
            height={20} 
            fontSize={10} 
            margin={0} 
            background="#ffffff" 
            lineColor="#000000" 
            displayValue={true}
          />
          
          <div className="text-[9px] font-bold mt-1">
            ₹{price.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Hidden printable area for QR Code */}
      <div className="hidden">
        <div 
            ref={qrRef} 
            className="print:flex flex-col items-center justify-center bg-white text-black overflow-hidden"
            style={{ width: '2in', height: '1in', padding: '0.05in', boxSizing: 'border-box' }} 
        >
          <div className="text-[7px] font-bold uppercase tracking-widest text-center text-gray-700 mb-0.5 max-w-full truncate">
            {pharmacyName}
          </div>
          <div className="text-[10px] font-bold truncate w-full text-center leading-tight mb-1 max-w-full">
            {medicineName}
          </div>
          
          <QRCodeCanvas 
            value={qrData}
            size={36}
            level={"M"}
            marginSize={0}
          />
          
          <div className="text-[9px] flex flex-col font-bold mt-1 text-center leading-tight">
             <span>₹{price.toFixed(2)} | B: {batch.substring(0, 15)}</span>
          </div>
        </div>
      </div>
    </>
  );
}
