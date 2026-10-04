"use client";

import type { DaybookResponse } from "@/hooks/useDaybook";

const styles = {
  page: {
    padding: 30,
    fontSize: 9,
    fontFamily: "Helvetica",
  },
  header: {
    marginBottom: 15,
    borderBottom: "1px solid #e5e7eb",
    paddingBottom: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold" as const,
    marginBottom: 4,
  },
  date: {
    fontSize: 11,
    color: "#6b7280",
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 9,
    color: "#9ca3af",
  },
  summaryGrid: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: 8,
    marginBottom: 15,
  },
  summaryCard: {
    width: "23%",
    padding: 8,
    backgroundColor: "#f9fafb",
    borderRadius: 4,
    border: "1px solid #e5e7eb",
  },
  summaryLabel: {
    fontSize: 7,
    color: "#6b7280",
    marginBottom: 4,
    textTransform: "uppercase" as const,
  },
  summaryValue: {
    fontSize: 12,
    fontWeight: "bold" as const,
    color: "#111827",
  },
  summarySubtext: {
    fontSize: 7,
    color: "#9ca3af",
    marginTop: 2,
  },
  section: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "bold" as const,
    color: "#111827",
    marginBottom: 6,
    paddingBottom: 3,
    borderBottom: "1px solid #e5e7eb",
  },
  table: {
    width: "100%",
  },
  tableHeader: {
    flexDirection: "row" as const,
    backgroundColor: "#f9fafb",
    borderBottom: "1px solid #e5e7eb",
    paddingVertical: 4,
    paddingHorizontal: 6,
    gap: 6,
  },
  tableRow: {
    flexDirection: "row" as const,
    borderBottom: "1px solid #f3f4f6",
    paddingVertical: 4,
    paddingHorizontal: 6,
    gap: 6,
  },
  tableRowAlternate: {
    backgroundColor: "#fafafa",
  },
  cellSmall: {
    width: "8%",
    fontSize: 8,
    color: "#374151",
  },
  cellMedium: {
    width: "15%",
    fontSize: 8,
    color: "#374151",
  },
  cellLarge: {
    width: "25%",
    fontSize: 8,
    color: "#374151",
  },
  cellRight: {
    textAlign: "right" as const,
  },
  cellBold: {
    fontWeight: "bold" as const,
  },
  statusBadge: {
    fontSize: 7,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 10,
    textAlign: "center" as const,
  },
  statusPaid: {
    backgroundColor: "#d1fae5",
    color: "#065f46",
  },
  statusPartial: {
    backgroundColor: "#fef3c7",
    color: "#92400e",
  },
  statusUnpaid: {
    backgroundColor: "#fee2e2",
    color: "#991b1b",
  },
  cashFlowBox: {
    marginTop: 10,
    padding: 8,
    backgroundColor: "#f0f9ff",
    borderRadius: 4,
    border: "1px solid #bae6fd",
    flexDirection: "row" as const,
    justifyContent: "space-between",
  },
  cashFlowLabel: {
    fontSize: 9,
    fontWeight: "bold" as const,
    color: "#0369a1",
  },
  cashFlowValue: {
    fontSize: 12,
    fontWeight: "bold" as const,
    color: "#0369a1",
  },
  footer: {
    position: "absolute" as const,
    bottom: 20,
    left: 30,
    right: 30,
    textAlign: "center" as const,
    fontSize: 7,
    color: "#d1d5db",
  },
  paymentMethods: {
    flexDirection: "row" as const,
    gap: 6,
    marginBottom: 12,
  },
  paymentMethodCard: {
    flex: 1,
    gap: 2,
    padding: 6,
    backgroundColor: "#f9fafb",
    borderRadius: 3,
    border: "1px solid #e5e7eb",
  },
  paymentMethodName: {
    fontSize: 8,
    fontWeight: "bold" as const,
    color: "#374151",
    marginBottom: 3,
  },
  paymentMethodAmount: {
    fontSize: 9,
    fontWeight: "bold" as const,
  },
  paymentMethodCount: {
    fontSize: 7,
    color: "#9ca3af",
    marginTop: 1,
  },
  // New styles for payment method balances
  balanceSection: {
    marginBottom: 12,
  },
  balanceGrid: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: 6,
    marginBottom: 8,
  },
  balanceCard: {
    width: "23%",
    padding: 6,
    backgroundColor: "#f9fafb",
    borderRadius: 3,
    border: "1px solid #e5e7eb",
  },
  balanceMethodName: {
    fontSize: 8,
    fontWeight: "bold" as const,
    color: "#374151",
    marginBottom: 4,
  },
  balanceType: {
    fontSize: 6,
    color: "#6b7280",
    backgroundColor: "#e5e7eb",
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderRadius: 2,
    marginLeft: 4,
  },
  balanceRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between",
    marginBottom: 2,
  },
  balanceLabel: {
    fontSize: 7,
    color: "#6b7280",
  },
  balanceValue: {
    fontSize: 7,
    fontWeight: "bold" as const,
    color: "#111827",
  },
  balanceClosing: {
    fontSize: 9,
    fontWeight: "bold" as const,
    color: "#111827",
    marginTop: 3,
    paddingTop: 3,
    borderTop: "1px solid #e5e7eb",
  },
  balanceSummary: {
    flexDirection: "row" as const,
    justifyContent: "space-between",
    padding: 6,
    backgroundColor: "#f0f9ff",
    borderRadius: 3,
    border: "1px solid #bae6fd",
    marginTop: 4,
  },
  balanceSummaryItem: {
    alignItems: "center" as const,
  },
  balanceSummaryLabel: {
    fontSize: 6,
    color: "#6b7280",
    textTransform: "uppercase" as const,
  },
  balanceSummaryValue: {
    fontSize: 8,
    fontWeight: "bold" as const,
    color: "#0369a1",
    marginTop: 1,
  },
};

const formatCurrency = (value?: number | null): string => {
  const num = Number(value || 0);
  return `Rs. ${num.toLocaleString("en-NP")}`;
};

const formatDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString("en-NP", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

interface DaybookPDFProps {
  data: DaybookResponse;
}

export function DaybookPDFContent({ data }: DaybookPDFProps) {
  const { summary, sales, expenses, summaries, date, paymentMethodBalances } =
    data;

  const {
    Document,
    Page,
    Text,
    View,
    StyleSheet,
  } = require("@react-pdf/renderer");

  const pdfStyles = StyleSheet.create(styles);

  // Calculate totals for payment method balances
  const totalOpeningBalance =
    paymentMethodBalances?.reduce((sum, pm) => sum + pm.opening_balance, 0) ||
    0;

  const totalClosingBalance =
    paymentMethodBalances?.reduce((sum, pm) => sum + pm.closing_balance, 0) ||
    0;

  const totalIn =
    paymentMethodBalances?.reduce((sum, pm) => sum + pm.total_in, 0) || 0;

  const totalOut =
    paymentMethodBalances?.reduce((sum, pm) => sum + pm.total_out, 0) || 0;

  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        {/* Header */}
        <View style={pdfStyles.header}>
          <Text style={pdfStyles.title}>Daily Report - Daybook</Text>
          <Text style={pdfStyles.date}>{formatDate(date)}</Text>
          <Text style={pdfStyles.subtitle}>
            Generated on {new Date().toLocaleDateString("en-NP")}
          </Text>
        </View>

        {/* Summary Cards */}
        <View style={pdfStyles.summaryGrid}>
          <View style={pdfStyles.summaryCard}>
            <Text style={pdfStyles.summaryLabel}>Total Sales</Text>
            <Text style={pdfStyles.summaryValue}>
              {formatCurrency(summary.total_sales_amount)}
            </Text>
            <Text style={pdfStyles.summarySubtext}>
              {summary.total_sales_count} transactions
            </Text>
          </View>

          <View style={pdfStyles.summaryCard}>
            <Text style={pdfStyles.summaryLabel}>Net Profit</Text>
            <Text
              style={[
                pdfStyles.summaryValue,
                { color: summary.net_profit >= 0 ? "#059669" : "#dc2626" },
              ]}
            >
              {formatCurrency(summary.net_profit)}
            </Text>
            <Text style={pdfStyles.summarySubtext}>
              Gross: {formatCurrency(summary.gross_profit)}
            </Text>
          </View>

          <View style={pdfStyles.summaryCard}>
            <Text style={pdfStyles.summaryLabel}>Total Expenses</Text>
            <Text style={[pdfStyles.summaryValue, { color: "#dc2626" }]}>
              {formatCurrency(summary.total_expense_amount)}
            </Text>
            <Text style={pdfStyles.summarySubtext}>
              {summary.total_expense_count} expenses
            </Text>
          </View>

          <View style={pdfStyles.summaryCard}>
            <Text style={pdfStyles.summaryLabel}>Net Cash Flow</Text>
            <Text
              style={[
                pdfStyles.summaryValue,
                { color: summary.net_cash_flow >= 0 ? "#059669" : "#dc2626" },
              ]}
            >
              {formatCurrency(summary.net_cash_flow)}
            </Text>
            <Text style={pdfStyles.summarySubtext}>
              Received: {formatCurrency(summary.total_received)}
            </Text>
          </View>
        </View>

        {/* Payment Method Balances Section */}
        {paymentMethodBalances && paymentMethodBalances.length > 0 && (
          <View style={pdfStyles.balanceSection}>
            <Text style={pdfStyles.sectionTitle}>Payment Method Balances</Text>
            <View style={pdfStyles.balanceGrid}>
              {paymentMethodBalances.map((pm) => (
                <View key={pm.payment_method_id} style={pdfStyles.balanceCard}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginBottom: 4,
                    }}
                  >
                    <Text style={pdfStyles.balanceMethodName}>
                      {pm.payment_method}
                    </Text>
                    <Text style={pdfStyles.balanceType}>
                      {pm.payment_method_type}
                    </Text>
                  </View>

                  <View style={pdfStyles.balanceRow}>
                    <Text style={pdfStyles.balanceLabel}>Opening</Text>
                    <Text style={pdfStyles.balanceValue}>
                      {formatCurrency(pm.opening_balance)}
                    </Text>
                  </View>

                  <View style={pdfStyles.balanceRow}>
                    <Text style={pdfStyles.balanceLabel}>In</Text>
                    <Text
                      style={[pdfStyles.balanceValue, { color: "#059669" }]}
                    >
                      {formatCurrency(pm.total_in)}
                    </Text>
                  </View>

                  <View style={pdfStyles.balanceRow}>
                    <Text style={pdfStyles.balanceLabel}>Out</Text>
                    <Text
                      style={[pdfStyles.balanceValue, { color: "#dc2626" }]}
                    >
                      {formatCurrency(pm.total_out)}
                    </Text>
                  </View>

                  <View style={pdfStyles.balanceClosing}>
                    <View style={pdfStyles.balanceRow}>
                      <Text style={pdfStyles.balanceLabel}>Closing</Text>
                      <Text style={[pdfStyles.balanceValue, { fontSize: 8 }]}>
                        {formatCurrency(pm.closing_balance)}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>

            {/* Balance Summary */}
            <View style={pdfStyles.balanceSummary}>
              <View style={pdfStyles.balanceSummaryItem}>
                <Text style={pdfStyles.balanceSummaryLabel}>Total Opening</Text>
                <Text style={pdfStyles.balanceSummaryValue}>
                  {formatCurrency(totalOpeningBalance)}
                </Text>
              </View>
              <View style={pdfStyles.balanceSummaryItem}>
                <Text style={pdfStyles.balanceSummaryLabel}>Total In</Text>
                <Text
                  style={[pdfStyles.balanceSummaryValue, { color: "#059669" }]}
                >
                  {formatCurrency(totalIn)}
                </Text>
              </View>
              <View style={pdfStyles.balanceSummaryItem}>
                <Text style={pdfStyles.balanceSummaryLabel}>Total Out</Text>
                <Text
                  style={[pdfStyles.balanceSummaryValue, { color: "#dc2626" }]}
                >
                  {formatCurrency(totalOut)}
                </Text>
              </View>
              <View style={pdfStyles.balanceSummaryItem}>
                <Text style={pdfStyles.balanceSummaryLabel}>Total Closing</Text>
                <Text
                  style={[pdfStyles.balanceSummaryValue, { color: "#0369a1" }]}
                >
                  {formatCurrency(totalClosingBalance)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Sales Table */}
        {sales.length > 0 && (
          <View style={pdfStyles.section}>
            <Text style={pdfStyles.sectionTitle}>Sales ({sales.length})</Text>
            <View style={pdfStyles.table}>
              <View style={pdfStyles.tableHeader}>
                <Text style={[pdfStyles.cellMedium, pdfStyles.cellBold]}>
                  Invoice
                </Text>
                <Text style={[pdfStyles.cellLarge, pdfStyles.cellBold]}>
                  Customer
                </Text>
                <Text
                  style={[
                    pdfStyles.cellMedium,
                    pdfStyles.cellRight,
                    pdfStyles.cellBold,
                  ]}
                >
                  Total
                </Text>
                <Text
                  style={[
                    pdfStyles.cellMedium,
                    pdfStyles.cellRight,
                    pdfStyles.cellBold,
                  ]}
                >
                  Paid
                </Text>
                <Text
                  style={[
                    pdfStyles.cellMedium,
                    pdfStyles.cellRight,
                    pdfStyles.cellBold,
                  ]}
                >
                  Remaining
                </Text>
                <Text style={[pdfStyles.cellSmall, pdfStyles.cellBold]}>
                  Status
                </Text>
              </View>

              {sales.map((sale, index) => (
                <View
                  key={sale.id}
                  style={[
                    pdfStyles.tableRow,
                    index % 2 === 0 ? {} : pdfStyles.tableRowAlternate,
                  ]}
                >
                  <Text style={pdfStyles.cellMedium}>{sale.invoice_no}</Text>
                  <Text style={pdfStyles.cellLarge}>
                    {sale.customer_name || "Walk-in"}
                  </Text>
                  <Text style={[pdfStyles.cellMedium, pdfStyles.cellRight]}>
                    {formatCurrency(sale.grand_total)}
                  </Text>
                  <Text
                    style={[
                      pdfStyles.cellMedium,
                      pdfStyles.cellRight,
                      { color: "#059669" },
                    ]}
                  >
                    {formatCurrency(sale.paid_amount)}
                  </Text>
                  <Text
                    style={[
                      pdfStyles.cellMedium,
                      pdfStyles.cellRight,
                      { color: "#dc2626" },
                    ]}
                  >
                    {formatCurrency(sale.remaining_amount)}
                  </Text>
                  <Text
                    style={[
                      pdfStyles.cellSmall,
                      pdfStyles.statusBadge,
                      sale.payment_status === "Paid"
                        ? pdfStyles.statusPaid
                        : sale.payment_status === "Partial"
                          ? pdfStyles.statusPartial
                          : pdfStyles.statusUnpaid,
                    ]}
                  >
                    {sale.payment_status}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Expenses Table */}
        {expenses.length > 0 && (
          <View style={pdfStyles.section}>
            <Text style={pdfStyles.sectionTitle}>
              Expenses ({expenses.length})
            </Text>
            <View style={pdfStyles.table}>
              <View style={pdfStyles.tableHeader}>
                <Text style={[pdfStyles.cellLarge, pdfStyles.cellBold]}>
                  Title
                </Text>
                <Text style={[pdfStyles.cellMedium, pdfStyles.cellBold]}>
                  Category
                </Text>
                <Text style={[pdfStyles.cellMedium, pdfStyles.cellBold]}>
                  Amount
                </Text>
                <Text style={[pdfStyles.cellLarge, pdfStyles.cellBold]}>
                  Payment Method
                </Text>
              </View>

              {expenses.map((expense, index) => (
                <View
                  key={expense.id}
                  style={[
                    pdfStyles.tableRow,
                    index % 2 === 0 ? {} : pdfStyles.tableRowAlternate,
                  ]}
                >
                  <Text style={pdfStyles.cellLarge}>{expense.title}</Text>
                  <Text style={pdfStyles.cellMedium}>{expense.category}</Text>
                  <Text style={[pdfStyles.cellMedium, { color: "#dc2626" }]}>
                    {formatCurrency(expense.amount)}
                  </Text>
                  <Text style={pdfStyles.cellLarge}>
                    {expense.payment_method || "Not specified"}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Net Cash Flow Summary */}
        <View style={pdfStyles.cashFlowBox}>
          <Text style={pdfStyles.cashFlowLabel}>Net Cash Flow</Text>
          <Text style={pdfStyles.cashFlowValue}>
            {formatCurrency(summary.net_cash_flow)}
          </Text>
        </View>

        {/* Footer */}
        <Text style={pdfStyles.footer}>
          Generated on {new Date().toLocaleString("en-NP")} • This is a
          computer-generated document
        </Text>
      </Page>
    </Document>
  );
}

// Wrapper component to handle type issues
export default function DaybookPDFDocument({ data }: DaybookPDFProps) {
  return <DaybookPDFContent data={data} />;
}
