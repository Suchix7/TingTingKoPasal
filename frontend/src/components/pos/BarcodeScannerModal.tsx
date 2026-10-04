"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";
import { X, RefreshCw, AlertCircle, Info } from "lucide-react";
import toast from "react-hot-toast";

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBarcodeScanned: (barcode: string) => void;
  buttonLabel?: string;
}

export function BarcodeScannerModal({
  isOpen,
  onClose,
  onBarcodeScanned,
  buttonLabel = "Scan Barcode",
}: BarcodeScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const errorCountRef = useRef(0);
  const lastErrorRef = useRef<string>("");

  const [status, setStatus] = useState<"initializing" | "scanning" | "error">(
    "initializing",
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [scanHint, setScanHint] = useState<string>("");
  const [hintType, setHintType] = useState<"info" | "warning" | "error">(
    "info",
  );

  const stopScanner = useCallback(() => {
    if (controlsRef.current) {
      try {
        controlsRef.current.stop();
      } catch (error) {
        console.warn("Error stopping scanner:", error);
      }
      controlsRef.current = null;
    }

    if (videoRef.current?.srcObject instanceof MediaStream) {
      const stream = videoRef.current.srcObject;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }

    streamRef.current = null;
    errorCountRef.current = 0;
    lastErrorRef.current = "";
  }, []);

  const startScanner = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    setStatus("initializing");
    setErrorMessage("");
    setScanHint("");
    setHintType("info");
    errorCountRef.current = 0;
    lastErrorRef.current = "";

    try {
      stopScanner();

      const hints = new Map<DecodeHintType, any>();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.EAN_13,
        BarcodeFormat.EAN_8,
        BarcodeFormat.CODE_128,
        BarcodeFormat.CODE_39,
        BarcodeFormat.UPC_A,
        BarcodeFormat.UPC_E,
        BarcodeFormat.QR_CODE,
      ]);

      const reader = new BrowserMultiFormatReader(hints);

      const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(
        navigator.userAgent,
      );

      const videoConstraints: MediaTrackConstraints = isMobile
        ? {
            facingMode: { ideal: "environment" },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          }
        : {
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          };

      const scannerPromise = reader.decodeFromConstraints(
        {
          video: videoConstraints,
          audio: false,
        },
        video,
        (result, error) => {
          // Successful scan
          if (result) {
            const barcode = result.getText();
            onBarcodeScanned(barcode);
            stopScanner();
            onClose();
            return;
          }

          // Handle ZXing errors
          if (error) {
            errorCountRef.current += 1;

            // Store the error name for debugging
            const errorName = error instanceof Error ? error.name : "Unknown";
            const errorMessage =
              error instanceof Error ? error.message : String(error);
            lastErrorRef.current = `${errorName}: ${errorMessage}`;

            // Ignore NotFoundException (expected on every frame without barcode)
            if (errorName === "NotFoundException") {
              // Show hint after 20 errors (frames without barcode detection)
              if (errorCountRef.current === 20) {
                setScanHint(
                  "Align the barcode within the red frame. Make sure it's well-lit and in focus.",
                );
                setHintType("info");
              }

              // Show stronger warning after 35 errors
              if (errorCountRef.current === 35) {
                setScanHint(
                  "Barcode not detected yet. Try moving closer or adjusting the angle.",
                );
                setHintType("warning");
              }

              // Show failure message after 50 errors
              if (errorCountRef.current === 50) {
                setScanHint(
                  "Failed to scan barcode. Please try again or enter the barcode manually.",
                );
                setHintType("error");

                // Optional: Add a visual shake effect to indicate failure
                // You could add a state for shake animation here
              }
            } else if (errorName !== "NotFoundException") {
              // Log non-NotFound errors for debugging
              console.warn(`[ZXing Error] ${errorName}: ${errorMessage}`);
            }
          }
        },
      );

      setStatus("scanning");

      scannerPromise
        .then((controls) => {
          controlsRef.current = controls;
        })
        .catch((error) => {
          console.error("Scanner error:", error);
          setStatus("error");

          if (error instanceof DOMException) {
            switch (error.name) {
              case "NotAllowedError":
                setErrorMessage(
                  "Camera permission denied. Please allow camera access.",
                );
                break;
              case "NotFoundError":
                setErrorMessage("No camera found on this device.");
                break;
              case "NotReadableError":
                setErrorMessage(
                  "Camera is already in use by another application.",
                );
                break;
              case "SecurityError":
                setErrorMessage("Camera access is blocked by the browser.");
                break;
              default:
                setErrorMessage(error.message || "Unable to start camera.");
            }
          } else {
            setErrorMessage("Unable to start the camera.");
          }
        });
    } catch (error) {
      console.error("Fatal scanner error:", error);
      setStatus("error");
      setErrorMessage("Unable to start the scanner.");
    }
  }, [stopScanner, onBarcodeScanned, onClose]);

  useEffect(() => {
    if (isOpen) {
      startScanner();
    }
    return () => {
      stopScanner();
    };
  }, [isOpen, startScanner, stopScanner]);

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
      >
        {/* Header */}
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              {buttonLabel}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Point your camera at a barcode to scan it
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={20} />
          </button>
        </div>

        {/* Camera View */}
        <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="h-full w-full object-cover"
          />

          {/* Scanning overlay */}
          {status === "scanning" && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative h-[75%] w-[88%] rounded-lg border-2 border-red-500">
                <div className="absolute top-0 left-0 h-4 w-4 border-t-4 border-l-4 border-red-500" />
                <div className="absolute top-0 right-0 h-4 w-4 border-t-4 border-r-4 border-red-500" />
                <div className="absolute bottom-0 left-0 h-4 w-4 border-b-4 border-l-4 border-red-500" />
                <div className="absolute bottom-0 right-0 h-4 w-4 border-b-4 border-r-4 border-red-500" />
                {/* Animated scan line */}
                <div className="absolute left-0 right-0 top-1/2 h-0.5 animate-pulse bg-red-500/50" />
              </div>
            </div>
          )}

          {/* Initializing overlay */}
          {status === "initializing" && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
              <div className="text-center text-white">
                <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-white/30 border-t-white" />
                <p>Starting camera...</p>
              </div>
            </div>
          )}

          {/* Error overlay */}
          {status === "error" && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70 p-6">
              <div className="text-center text-white">
                <AlertCircle className="mx-auto mb-2" size={32} />
                <p className="mb-2 text-lg font-semibold">Camera Error</p>
                <p className="text-sm">{errorMessage}</p>
              </div>
            </div>
          )}
        </div>

        {/* Scan Hint Messages */}
        {status === "scanning" && scanHint && (
          <div
            className={`mt-4 flex items-start gap-3 rounded-lg p-3 ${
              hintType === "info"
                ? "bg-blue-50 border border-blue-200"
                : hintType === "warning"
                  ? "bg-yellow-50 border border-yellow-200"
                  : "bg-red-50 border border-red-200"
            }`}
          >
            {hintType === "info" && (
              <Info size={18} className="mt-0.5 flex-shrink-0 text-blue-500" />
            )}
            {hintType === "warning" && (
              <AlertCircle
                size={18}
                className="mt-0.5 flex-shrink-0 text-yellow-500"
              />
            )}
            {hintType === "error" && (
              <AlertCircle
                size={18}
                className="mt-0.5 flex-shrink-0 text-red-500"
              />
            )}
            <p
              className={`text-sm ${
                hintType === "info"
                  ? "text-blue-700"
                  : hintType === "warning"
                    ? "text-yellow-700"
                    : "text-red-700"
              }`}
            >
              {scanHint}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="mt-4 flex justify-end gap-3">
          <button
            type="button"
            onClick={startScanner}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            <RefreshCw size={14} />
            Restart
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Cancel
          </button>
        </div>

        {/* Debug info (optional - remove in production) */}
        {process.env.NODE_ENV === "development" && (
          <div className="mt-3 border-t border-slate-100 pt-2">
            <p className="text-xs text-slate-400">
              Frames scanned: {errorCountRef.current} | Last error:{" "}
              {lastErrorRef.current || "None"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
