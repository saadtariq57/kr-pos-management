import { jsPDF } from "jspdf";

export type OrderBillPdfInput = {
  order_number: number;
  currency: string;
  subtotal_amount: number;
  tax_amount: number;
  discount_amount: number;
  final_amount: number;
  customer: { name: string; phone: string };
  items: {
    item_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }[];
  order_type: string;
  table_number: number | null;
  created_at?: string | Date | null;
  cashier_name?: string | null;
  waiter_name?: string | null;
  chef_name?: string | null;
  payment?: {
    status: string;
    method?: string | null;
    paid_at?: string | Date | null;
    reference?: string | null;
  } | null;
  branch?: {
    name?: string | null;
    city?: string | null;
  } | null;
};

function fmtPkr(n: number) {
  return new Intl.NumberFormat("en-PK", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
}

function fmtWhen(v: string | Date | null | undefined) {
  if (v == null) return new Date().toLocaleString("en-PK");
  const d = typeof v === "string" ? new Date(v) : v;
  if (Number.isNaN(d.getTime())) return new Date().toLocaleString("en-PK");
  return d.toLocaleString("en-PK");
}

/**
 * Builds a simple tax-invoice style PDF and triggers a browser download.
 * The file is not stored on the server; it goes to the user’s Downloads folder.
 */
export function downloadOrderBillPdf(bill: OrderBillPdfInput) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 48;
  let y = margin;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("KR Restaurant", margin, y);
  y += 22;
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("Bill / Order receipt", margin, y);
  if (bill.branch?.name) {
    doc.text(
      `${bill.branch.name}${bill.branch.city ? ` · ${bill.branch.city}` : ""}`,
      pageW - margin,
      y,
      { align: "right" },
    );
  }
  y += 28;

  doc.setFontSize(10);
  doc.text(`Order #${bill.order_number}`, margin, y);
  doc.text(fmtWhen(bill.created_at), pageW - margin, y, { align: "right" });
  y += 16;
  doc.text(`Type: ${bill.order_type}`, margin, y);
  y += 14;
  if (bill.table_number != null) {
    doc.text(`Table: ${bill.table_number}`, margin, y);
    y += 14;
  }
  doc.text(`Customer: ${bill.customer.name}`, margin, y);
  y += 14;
  doc.text(`Phone: ${bill.customer.phone}`, margin, y);
  y += 18;

  // Staff attribution block — who handled this ticket end-to-end.
  if (bill.cashier_name || bill.waiter_name || bill.chef_name) {
    doc.setFont("helvetica", "bold");
    doc.text("Handled by", margin, y);
    doc.setFont("helvetica", "normal");
    y += 14;
    if (bill.cashier_name) {
      doc.text(`Cashier: ${bill.cashier_name}`, margin, y);
      y += 12;
    }
    if (bill.waiter_name) {
      doc.text(`Waiter: ${bill.waiter_name}`, margin, y);
      y += 12;
    }
    if (bill.chef_name) {
      doc.text(`Chef: ${bill.chef_name}`, margin, y);
      y += 12;
    }
    y += 6;
  }

  doc.setDrawColor(40);
  doc.line(margin, y, pageW - margin, y);
  y += 14;

  doc.setFont("helvetica", "bold");
  doc.text("Item", margin, y);
  doc.text("Qty", margin + 220, y);
  doc.text("Unit", margin + 260, y);
  doc.text("Total", pageW - margin, y, { align: "right" });
  y += 12;
  doc.setFont("helvetica", "normal");
  doc.line(margin, y, pageW - margin, y);
  y += 16;

  const maxW = 200;
  for (const row of bill.items) {
    const lines = doc.splitTextToSize(row.item_name, maxW);
    const blockH = Math.max(14, lines.length * 12);
    if (y + blockH > doc.internal.pageSize.getHeight() - 120) {
      doc.addPage();
      y = margin;
    }
    doc.text(lines, margin, y);
    doc.text(String(row.quantity), margin + 220, y);
    doc.text(`${fmtPkr(row.unit_price)} ${bill.currency}`, margin + 260, y);
    doc.text(`${fmtPkr(row.total_price)} ${bill.currency}`, pageW - margin, y, {
      align: "right",
    });
    y += blockH + 6;
  }

  y += 10;
  doc.line(margin, y, pageW - margin, y);
  y += 20;

  const labelX = pageW - margin - 140;
  const valX = pageW - margin;
  doc.text("Subtotal", labelX, y);
  doc.text(`${fmtPkr(bill.subtotal_amount)} ${bill.currency}`, valX, y, {
    align: "right",
  });
  y += 14;
  doc.text("Discount", labelX, y);
  doc.text(`${fmtPkr(bill.discount_amount)} ${bill.currency}`, valX, y, {
    align: "right",
  });
  y += 14;
  doc.text("Tax", labelX, y);
  doc.text(`${fmtPkr(bill.tax_amount)} ${bill.currency}`, valX, y, {
    align: "right",
  });
  y += 18;
  doc.setFont("helvetica", "bold");
  doc.text("Total", labelX, y);
  doc.text(`${fmtPkr(bill.final_amount)} ${bill.currency}`, valX, y, {
    align: "right",
  });
  y += 24;

  // Payment block — keeps cash-vs-card status on the customer's copy of the
  // receipt so disputes can be resolved at a glance.
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(0);
  if (bill.payment && bill.payment.status === "paid") {
    const method = bill.payment.method
      ? bill.payment.method[0].toUpperCase() + bill.payment.method.slice(1)
      : "—";
    doc.text(`Payment: PAID · ${method}`, margin, y);
    y += 12;
    if (bill.payment.paid_at) {
      doc.text(`Paid at: ${fmtWhen(bill.payment.paid_at)}`, margin, y);
      y += 12;
    }
    if (bill.payment.reference) {
      doc.text(`Ref: ${bill.payment.reference}`, margin, y);
      y += 12;
    }
  } else {
    doc.text("Payment: UNPAID", margin, y);
    y += 12;
  }

  y += 8;
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text("Thank you for dining with us.", margin, y);

  const safeName = `KR-bill-${bill.order_number}.pdf`;
  doc.save(safeName);
}

/** sessionStorage key used right after checkout so the order page can auto-download the PDF once */
export function pendingBillStorageKey(orderId: string) {
  return `kr_order_bill_${orderId}`;
}

/** Build bill input from GET /api/orders/:id payload (for re-download anytime). */
export function billFromOrderDetail(d: {
  order: {
    order_number: number;
    order_type: string;
    table_number?: number | null;
    subtotal_amount: number;
    tax_amount: number;
    discount_amount: number;
    final_amount: number;
    created_at?: string;
  };
  items: Array<{
    item_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }>;
  customer: { name?: string; phone?: string } | null;
  cashier?: { name?: string } | null;
  waiter?: { name?: string } | null;
  chef?: { name?: string } | null;
  payment?: {
    payment_status: string;
    payment_method: string;
    paid_at?: string | null;
    transaction_reference?: string | null;
  } | null;
  is_paid?: boolean;
}): OrderBillPdfInput {
  const c = d.customer;
  return {
    order_number: d.order.order_number,
    currency: "PKR",
    subtotal_amount: d.order.subtotal_amount,
    tax_amount: d.order.tax_amount,
    discount_amount: d.order.discount_amount,
    final_amount: d.order.final_amount,
    customer: {
      name: (c?.name ?? "—").trim() || "—",
      phone: (c?.phone ?? "—").trim() || "—",
    },
    items: d.items.map((i) => ({
      item_name: i.item_name,
      quantity: i.quantity,
      unit_price: i.unit_price,
      total_price: i.total_price,
    })),
    order_type: d.order.order_type,
    table_number: d.order.table_number ?? null,
    created_at: d.order.created_at,
    cashier_name: d.cashier?.name ?? null,
    waiter_name: d.waiter?.name ?? null,
    chef_name: d.chef?.name ?? null,
    payment: d.payment
      ? {
          status: d.is_paid ? "paid" : d.payment.payment_status,
          method: d.payment.payment_method,
          paid_at: d.payment.paid_at,
          reference: d.payment.transaction_reference,
        }
      : d.is_paid
        ? { status: "paid" }
        : null,
  };
}
