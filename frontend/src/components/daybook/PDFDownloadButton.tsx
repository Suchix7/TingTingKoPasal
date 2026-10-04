"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import type { DaybookResponse } from "@/hooks/useDaybook";
import DaybookPDFDocument from "./DaybookPDF";

interface DaybookPDFDownloadButtonProps {
  data: DaybookResponse;
  className?: string;
}

function DownloadIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}

function PDFDownloadButton({ data, className }: DaybookPDFDownloadButtonProps) {
  const { PDFDownloadLink } = require("@react-pdf/renderer");

  return (
    <PDFDownloadLink
      document={<DaybookPDFDocument data={data} />}
      fileName={`daybook-${data.date}.pdf`}
      className={className}
    >
      {({ loading, error }: { loading: boolean; error: Error | null }) =>
        loading ? (
          <span className="inline-flex items-center gap-2 rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-500">
            <Loader2 size={16} className="animate-spin" />
            Preparing PDF...
          </span>
        ) : error ? (
          <span className="inline-flex items-center gap-2 rounded-xl bg-red-50 px-4 py-2.5 text-sm font-medium text-red-600">
            Failed to load
          </span>
        ) : (
          <span className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-700">
            <DownloadIcon />
            Download PDF
          </span>
        )
      }
    </PDFDownloadLink>
  );
}

export default function DaybookPDFDownloadButton({
  data,
  className = "",
}: DaybookPDFDownloadButtonProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <span className="inline-flex items-center gap-2 rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-500">
        <Loader2 size={16} className="animate-spin" />
        Loading...
      </span>
    );
  }

  return <PDFDownloadButton data={data} className={className} />;
}
