"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode"
import { AlertCircle, Camera, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface BarcodeScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanFailure?: (error: any) => void;
}

type ScannerState = "initializing" | "scanning" | "permission_denied" | "no_camera" | "error"

export default function BarcodeScanner({ onScanSuccess, onScanFailure }: BarcodeScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<ScannerState>("initializing");
  const [errorMessage, setErrorMessage] = useState("");
  const [lastDetected, setLastDetected] = useState<string | null>(null);
  const lastScannedRef = useRef<{ code: string; time: number }>({ code: "", time: 0 });
  const mountedRef = useRef(true);

  const handleDetection = useCallback((decodedText: string) => {
    const now = Date.now();
    // Debounce: ignore same barcode within 3 seconds
    if (
      decodedText === lastScannedRef.current.code &&
      now - lastScannedRef.current.time < 3000
    ) {
      return;
    }
    lastScannedRef.current = { code: decodedText, time: now };
    setLastDetected(decodedText);
    // Clear the visual indicator after 3 seconds
    setTimeout(() => setLastDetected(null), 3000);
    onScanSuccess(decodedText);
  }, [onScanSuccess]);

  useEffect(() => {
    mountedRef.current = true;
    let scanner: Html5Qrcode | null = null;

    const startScanner = async () => {
      // Small delay for React Strict Mode double-mount
      await new Promise(r => setTimeout(r, 150));
      if (!mountedRef.current) return;

      const readerId = "barcode-reader-region";

      try {
        scanner = new Html5Qrcode(readerId, {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.QR_CODE,
          ],
          verbose: false,
        });

        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 15,
            qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
              // Wide rectangle optimized for 1D barcodes
              const width = Math.min(Math.floor(viewfinderWidth * 0.85), 400);
              const height = Math.min(Math.floor(viewfinderHeight * 0.35), 160);
              return { width, height };
            },
            aspectRatio: 1.333,
            disableFlip: false,
          },
          handleDetection,
          (errorMsg) => {
            // This fires on every frame without a detection — do nothing
            onScanFailure?.(errorMsg);
          }
        );

        if (mountedRef.current) {
          setState("scanning");
        }
      } catch (err: any) {
        if (!mountedRef.current) return;

        const msg = typeof err === "string" ? err : err?.message || "";
        console.error("BarcodeScanner: start failed:", msg);

        if (
          msg.includes("NotAllowedError") ||
          msg.includes("Permission") ||
          msg.includes("denied")
        ) {
          setState("permission_denied");
          setErrorMessage("Camera access was denied. Please allow camera permissions in your browser settings and reload.");
        } else if (
          msg.includes("NotFoundError") ||
          msg.includes("no camera") ||
          msg.includes("Requested device not found")
        ) {
          setState("no_camera");
          setErrorMessage("No camera found on this device.");
        } else {
          setState("error");
          setErrorMessage(msg || "Could not start camera. Please try again.");
        }
      }
    };

    startScanner();

    return () => {
      mountedRef.current = false;
      if (scanner) {
        const s = scanner;
        scannerRef.current = null;
        s.stop().catch((e) => console.error("BarcodeScanner: stop failed:", e));
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (state === "permission_denied" || state === "no_camera" || state === "error") {
    return (
      <div className="w-full max-w-md mx-auto overflow-hidden rounded-xl border border-destructive/30 bg-destructive/5 shadow-sm">
        <div className="flex flex-col items-center justify-center p-6 gap-3 text-center">
          <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
            {state === "permission_denied" ? (
              <Camera className="h-6 w-6 text-destructive" />
            ) : (
              <AlertCircle className="h-6 w-6 text-destructive" />
            )}
          </div>
          <h3 className="text-sm font-semibold text-destructive">
            {state === "permission_denied" ? "Camera Permission Required" :
             state === "no_camera" ? "No Camera Available" : "Camera Error"}
          </h3>
          <p className="text-xs text-muted-foreground max-w-[280px]">
            {errorMessage}
          </p>
          {state === "permission_denied" && (
            <button
              onClick={() => window.location.reload()}
              className="mt-1 text-xs font-medium text-primary underline underline-offset-2 hover:opacity-80"
            >
              Reload Page
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto overflow-hidden rounded-xl border border-border bg-card shadow-sm relative">
      {state === "initializing" && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-card/90 gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground">Starting camera…</p>
        </div>
      )}

      {/* Detection feedback overlay */}
      {lastDetected && (
        <div className="absolute top-2 left-2 right-2 z-20 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="bg-green-500/90 text-white text-xs font-medium px-3 py-2 rounded-lg text-center backdrop-blur-sm shadow-lg">
            ✓ Detected: <span className="font-mono">{lastDetected}</span>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        #barcode-reader-region { border: none !important; background: transparent !important; padding: 0 !important; }
        #barcode-reader-region video { border-radius: 8px !important; }
        #barcode-reader-region img[alt="Info icon"] { display: none !important; }
        /* Hide all the library's built-in UI buttons */
        #barcode-reader-region__dashboard_section,
        #barcode-reader-region__dashboard_section_csr,
        #barcode-reader-region__dashboard_section_swaplink,
        #barcode-reader-region__header_message,
        #barcode-reader-region button,
        #barcode-reader-region select { display: none !important; }
        /* Style the scan region border */
        #barcode-reader-region__scan_region { position: relative !important; }
        #barcode-reader-region__scan_region > img { display: none !important; }
      `}} />
      <div id="barcode-reader-region" ref={containerRef} className="w-full relative" />
    </div>
  );
}
