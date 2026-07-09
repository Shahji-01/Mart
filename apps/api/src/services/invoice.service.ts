import PDFDocument from "pdfkit";
import type { Response } from "express";
import { settingsService } from "./settings.service";

export class InvoiceService {
  async generateInvoice(order: any, res: Response) {
    const settings = await settingsService.getSettings();

    const doc = new PDFDocument({ margin: 50 });
    
    // Pipe the PDF document to the response
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=invoice-${order.id}.pdf`);
    doc.pipe(res);

    // Header
    doc
      .fontSize(20)
      .text(settings.storeName, 50, 50)
      .fontSize(10)
      .text(settings.fullName, 50, 75)
      .text(settings.address, 50, 90)
      .text(`Email: ${settings.email}`, 50, 105)
      .text(`Phone: ${settings.phone}`, 50, 120);

    if (settings.gstin) {
      doc.text(`GSTIN: ${settings.gstin}`, 50, 135);
    }

    doc
      .fontSize(20)
      .text("INVOICE", 400, 50, { align: "right" })
      .fontSize(10)
      .text(`Invoice Number: #${order.id}`, 400, 75, { align: "right" })
      .text(`Date: ${new Date(order.createdAt).toLocaleDateString()}`, 400, 90, { align: "right" })
      .text(`Payment Status: ${order.paymentStatus.toUpperCase()}`, 400, 105, { align: "right" });

    doc.moveTo(50, 160).lineTo(550, 160).stroke();

    // Customer info
    doc
      .fontSize(12)
      .text("Billed To:", 50, 180)
      .fontSize(10)
      .text(`Name: ${order.userName || "Customer"}`, 50, 195)
      .text(`Address: ${order.address}`, 50, 210);

    doc.moveTo(50, 250).lineTo(550, 250).stroke();

    // Table Header
    let y = 270;
    doc.fontSize(10).font("Helvetica-Bold");
    doc.text("Item", 50, y);
    doc.text("Variant", 250, y);
    doc.text("Price", 350, y, { width: 50, align: "right" });
    doc.text("Qty", 420, y, { width: 30, align: "right" });
    doc.text("Total", 480, y, { width: 70, align: "right" });

    doc.moveTo(50, y + 15).lineTo(550, y + 15).stroke();
    y += 25;

    // Table Rows
    doc.font("Helvetica");
    for (const item of order.items) {
      doc.text(item.productName, 50, y, { width: 190 });
      doc.text(`${item.unitValue} ${item.unit}`, 250, y, { width: 90 });
      doc.text(`Rs ${item.price.toFixed(2)}`, 350, y, { width: 50, align: "right" });
      doc.text(item.quantity.toString(), 420, y, { width: 30, align: "right" });
      doc.text(`Rs ${item.subtotal.toFixed(2)}`, 480, y, { width: 70, align: "right" });
      y += 20;
    }

    doc.moveTo(50, y + 10).lineTo(550, y + 10).stroke();
    y += 25;

    // Totals
    doc.font("Helvetica-Bold");
    doc.text("Subtotal:", 350, y, { width: 100, align: "right" });
    doc.text(`Rs ${order.subtotal.toFixed(2)}`, 450, y, { width: 100, align: "right" });
    y += 20;

    if (order.discount > 0) {
      doc.text("Discount:", 350, y, { width: 100, align: "right" });
      doc.text(`- Rs ${order.discount.toFixed(2)}`, 450, y, { width: 100, align: "right" });
      y += 20;
    }
    if (order.walletAmountUsed > 0) {
      doc.text("Wallet Applied:", 350, y, { width: 100, align: "right" });
      doc.text(`- Rs ${order.walletAmountUsed.toFixed(2)}`, 450, y, { width: 100, align: "right" });
      y += 20;
    }
    
    doc.text("Delivery Fee:", 350, y, { width: 100, align: "right" });
    doc.text(`Rs ${order.deliveryFee.toFixed(2)}`, 450, y, { width: 100, align: "right" });
    y += 25;

    doc.fontSize(14);
    doc.text("Grand Total:", 300, y, { width: 150, align: "right" });
    doc.text(`Rs ${order.total.toFixed(2)}`, 450, y, { width: 100, align: "right" });
    
    doc.end();
  }
}

export const invoiceService = new InvoiceService();
