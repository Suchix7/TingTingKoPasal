"use client";

// A4 page, in points (1pt = 1/72in). These match react-pdf's own `size="A4"`.
const PAGE_WIDTH_PT = 595.28;
const PAGE_HEIGHT_PT = 841.89;
const PAGE_MARGIN_PT = 28; // ~10mm

const COLUMNS = 3;
const ROWS = 6;
const LABELS_PER_PAGE = COLUMNS * ROWS;

const CONTENT_WIDTH_PT = PAGE_WIDTH_PT - PAGE_MARGIN_PT * 2;
const CONTENT_HEIGHT_PT = PAGE_HEIGHT_PT - PAGE_MARGIN_PT * 2;
const CELL_WIDTH_PT = CONTENT_WIDTH_PT / COLUMNS;
const CELL_HEIGHT_PT = CONTENT_HEIGHT_PT / ROWS;

// Target barcode render width: ~95pt (~33.5mm) is ~90% of GS1 nominal size
// for EAN-13, comfortably within the 80%-200% range scanners expect. Actual
// height is derived per-label from the barcode's real aspect ratio so the
// image is never stretched/squashed out of proportion.
const BARCODE_DISPLAY_WIDTH_PT = 95;

const styles = {
  page: {
    paddingTop: PAGE_MARGIN_PT,
    paddingLeft: PAGE_MARGIN_PT,
    fontFamily: "Helvetica",
  },
  grid: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    width: CONTENT_WIDTH_PT,
  },
  label: {
    width: CELL_WIDTH_PT,
    height: CELL_HEIGHT_PT,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderStyle: "dashed" as const,
    borderColor: "#cbd5e1",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    // A long product name can wrap to more lines than the fixed cell
    // height budgets for; without clipping, that overflow bleeds down
    // into the label below it instead of just being cropped.
    overflow: "hidden" as const,
  },
  productName: {
    fontSize: 9,
    fontWeight: "bold" as const,
    textAlign: "center" as const,
    marginBottom: 5,
  },
  barcodeNumber: {
    fontFamily: "Courier",
    fontSize: 8,
    letterSpacing: 0.5,
    textAlign: "center" as const,
    marginTop: 3,
  },
  price: {
    fontSize: 8,
    fontWeight: "bold" as const,
    color: "#334155",
    marginTop: 4,
  },
};

export type LabelItem = {
  productName: string;
  barcode: string;
  salePrice?: number;
  barcodeImage: string; // data URI, bars only — no baked-in text
  barcodeAspectRatio: number; // canvas.height / canvas.width, for undistorted display
};

interface LabelSheetPDFProps {
  labels: LabelItem[];
}

export function LabelSheetPDFContent({ labels }: LabelSheetPDFProps) {
  const { Document, Page, Text, View, Image, StyleSheet } = require("@react-pdf/renderer");

  const pdfStyles = StyleSheet.create(styles);

  const pages: LabelItem[][] = [];
  for (let i = 0; i < labels.length; i += LABELS_PER_PAGE) {
    pages.push(labels.slice(i, i + LABELS_PER_PAGE));
  }

  if (pages.length === 0) {
    pages.push([]);
  }

  return (
    <Document>
      {pages.map((pageLabels, pageIndex) => (
        <Page key={pageIndex} size="A4" style={pdfStyles.page}>
          <View style={pdfStyles.grid}>
            {pageLabels.map((label, index) => (
              <View key={`${label.barcode}-${index}`} style={pdfStyles.label}>
                <Text style={pdfStyles.productName} numberOfLines={2}>
                  {label.productName}
                </Text>
                <Image
                  style={{
                    width: BARCODE_DISPLAY_WIDTH_PT,
                    height: BARCODE_DISPLAY_WIDTH_PT * label.barcodeAspectRatio,
                  }}
                  src={label.barcodeImage}
                />
                <Text style={pdfStyles.barcodeNumber}>{label.barcode}</Text>
                {label.salePrice !== undefined && (
                  <Text style={pdfStyles.price}>
                    Rs. {label.salePrice.toLocaleString()}
                  </Text>
                )}
              </View>
            ))}
          </View>
        </Page>
      ))}
    </Document>
  );
}

export default function LabelSheetPDFDocument({ labels }: LabelSheetPDFProps) {
  return <LabelSheetPDFContent labels={labels} />;
}
