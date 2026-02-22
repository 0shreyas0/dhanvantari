"use client"

import { useState, useEffect, useRef } from "react"
import { Html5QrcodeScanner } from "html5-qrcode"

interface BarcodeScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanFailure?: (error: any) => void;
}

export default function BarcodeScanner({ onScanSuccess, onScanFailure }: BarcodeScannerProps) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    // Initialize scanner
    // Note: html5-qrcode attaches to an element ID.
    const config = { 
        fps: 10, 
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
    };
    
    // We need to ensure the element exists before initializing
    const scanner = new Html5QrcodeScanner(
      "reader",
      config,
      /* verbose= */ false
    );
    
    scanner.render(onScanSuccess, onScanFailure);
    scannerRef.current = scanner;

    return () => {
      if (scannerRef.current) {
        try {
            scannerRef.current.clear().catch(error => {
                console.error("Failed to clear html5-qrcode scanner. ", error);
            });
        } catch (e) {
            console.error(e);
        }
      }
    };
  }, [onScanSuccess, onScanFailure]);

  return (
    <div className="w-full max-w-md mx-auto overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <style dangerouslySetInnerHTML={{ __html: `
        #reader { border: none !important; background: transparent !important; padding: 20px 0 !important; }
        #reader * { border: none !important; box-shadow: none !important; }
        #reader__dashboard_section_csr > span { color: var(--color-foreground) !important; margin-bottom: 8px !important; display: block !important; font-size: 14px !important; text-align: center !important; }
        #reader button, #reader span[id*="anchor-scan-type-change"] { 
          background: var(--color-primary) !important; 
          color: var(--color-primary-foreground) !important; 
          border-radius: 6px !important; 
          padding: 8px 16px !important; 
          font-size: 14px !important;
          font-weight: 500 !important;
          text-decoration: none !important;
          margin: 8px auto !important;
          width: 100% !important;
          max-width: 260px !important;
          cursor: pointer !important;
          transition: opacity 0.2s !important;
          text-align: center !important;
          /* Omitting !important on display allows the library's inline 'display: none' to work */
          display: inline-block;
        }
        #reader span[id*="anchor-scan-type-change"] {
          display: block;
        }
        #reader button:hover, #reader span[id*="anchor-scan-type-change"]:hover { opacity: 0.9 !important; }
        #reader img { opacity: 0.7 !important; display: block !important; margin: 0 auto 16px auto !important; max-width: 100px !important; }
        :is(.dark, [data-theme="dark"]) #reader img { filter: brightness(0) invert(1) !important; }
      `}} />
      <div id="reader" className="w-full relative"></div>
    </div>
  );
}
