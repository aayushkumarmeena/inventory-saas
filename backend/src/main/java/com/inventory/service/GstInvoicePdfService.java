package com.inventory.service;

import com.inventory.dto.response.GstInvoiceItemResponse;
import com.inventory.dto.response.GstInvoiceResponse;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDFont;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.util.List;

/**
 * Renders a GST tax invoice as a simple, print-ready single-page PDF using
 * PDFBox directly (no external template engine) — a plain business
 * document, not a design showpiece: seller/buyer blocks, a line-item
 * table, and a tax summary, matching what GST invoices conventionally
 * need to show.
 */
@Service
public class GstInvoicePdfService {

    private static final float MARGIN = 40;
    private static final float PAGE_WIDTH = PDRectangle.A4.getWidth();

    public byte[] render(GstInvoiceResponse inv) throws IOException {
        try (PDDocument doc = new PDDocument()) {
            PDPage page = new PDPage(PDRectangle.A4);
            doc.addPage(page);

            PDFont bold = PDType1Font.HELVETICA_BOLD;
            PDFont regular = PDType1Font.HELVETICA;

            try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
                float y = page.getMediaBox().getHeight() - MARGIN;

                y = text(cs, bold, 18, MARGIN, y, "TAX INVOICE");
                if (Boolean.TRUE.equals(inv.getIsCancelled())) {
                    text(cs, bold, 14, PAGE_WIDTH - MARGIN - 90, y + 20, "CANCELLED");
                }
                y -= 8;
                y = text(cs, regular, 10, MARGIN, y, "Invoice #: " + nz(inv.getInvoiceNumber()) + "    Date: " + nz(inv.getInvoiceDate()));
                y -= 14;
                y = line(cs, y);
                y -= 14;

                float colWidth = (PAGE_WIDTH - 2 * MARGIN) / 2;
                float sellerY = y;
                sellerY = text(cs, bold, 10, MARGIN, sellerY, "SELLER");
                sellerY = text(cs, regular, 9, MARGIN, sellerY - 12, nz(inv.getSellerLegalName()));
                sellerY = text(cs, regular, 9, MARGIN, sellerY - 12, "GSTIN: " + nz(inv.getSellerGstin()));
                sellerY = text(cs, regular, 9, MARGIN, sellerY - 12, nz(inv.getSellerAddress()));
                sellerY = text(cs, regular, 9, MARGIN, sellerY - 12, nz(inv.getSellerState()) + " (" + nz(inv.getSellerStateCode()) + ")");

                float buyerX = MARGIN + colWidth;
                float buyerY = y;
                buyerY = text(cs, bold, 10, buyerX, buyerY, "BUYER");
                buyerY = text(cs, regular, 9, buyerX, buyerY - 12, nz(inv.getBuyerName()));
                buyerY = text(cs, regular, 9, buyerX, buyerY - 12, "GSTIN: " + nz(inv.getBuyerGstin()));
                buyerY = text(cs, regular, 9, buyerX, buyerY - 12, nz(inv.getBuyerAddress()));
                buyerY = text(cs, regular, 9, buyerX, buyerY - 12, nz(inv.getBuyerState()) + " (" + nz(inv.getBuyerStateCode()) + ")");
                buyerY = text(cs, regular, 9, buyerX, buyerY - 12, "Place of supply: " + nz(inv.getPlaceOfSupply()));

                y = Math.min(sellerY, buyerY) - 16;
                y = line(cs, y);
                y -= 16;

                float[] colX = {MARGIN, MARGIN + 190, MARGIN + 250, MARGIN + 300, MARGIN + 360, MARGIN + 420, MARGIN + 470};
                String[] headers = {"Item", "HSN/SAC", "Qty", "Rate", "Taxable", "GST", "Total"};
                for (int i = 0; i < headers.length; i++) {
                    text(cs, bold, 8.5f, colX[i], y, headers[i]);
                }
                y -= 6;
                y = line(cs, y);
                y -= 12;

                List<GstInvoiceItemResponse> items = inv.getItems() != null ? inv.getItems() : List.of();
                for (GstInvoiceItemResponse item : items) {
                    if (y < 120) break;
                    BigDecimal gstRate = nz0(item.getCgstRate()).add(nz0(item.getSgstRate())).add(nz0(item.getIgstRate()));
                    text(cs, regular, 8.5f, colX[0], y, truncate(nz(item.getProductName()), 28));
                    text(cs, regular, 8.5f, colX[1], y, nz(item.getHsnSacCode()));
                    text(cs, regular, 8.5f, colX[2], y, String.valueOf(item.getQuantity()));
                    text(cs, regular, 8.5f, colX[3], y, money(item.getUnitPrice()));
                    text(cs, regular, 8.5f, colX[4], y, money(item.getTaxableValue()));
                    text(cs, regular, 8.5f, colX[5], y, gstRate + "%");
                    text(cs, regular, 8.5f, colX[6], y, money(item.getTotalAmount()));
                    y -= 14;
                }

                y -= 6;
                y = line(cs, y);
                y -= 16;

                float summaryX = PAGE_WIDTH - MARGIN - 180;
                y = summaryRow(cs, regular, summaryX, y, "Taxable value", money(inv.getTaxableValue()));
                y = summaryRow(cs, regular, summaryX, y, "CGST", money(inv.getCgstAmount()));
                y = summaryRow(cs, regular, summaryX, y, "SGST", money(inv.getSgstAmount()));
                y = summaryRow(cs, regular, summaryX, y, "IGST", money(inv.getIgstAmount()));
                if (nz0(inv.getCessAmount()).compareTo(BigDecimal.ZERO) > 0) {
                    y = summaryRow(cs, regular, summaryX, y, "Cess", money(inv.getCessAmount()));
                }
                y -= 4;
                y = summaryRow(cs, bold, summaryX, y, "Total", money(inv.getTotalAmount()));

                if (Boolean.TRUE.equals(inv.getIsCancelled())) {
                    y -= 24;
                    text(cs, bold, 9, MARGIN, y, "CANCELLED: " + nz(inv.getCancelReason()));
                }

                text(cs, regular, 8, MARGIN, MARGIN, "This is a system-generated tax invoice.");
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            doc.save(out);
            return out.toByteArray();
        }
    }

    private float text(PDPageContentStream cs, PDFont font, float size, float x, float y, String s) throws IOException {
        cs.beginText();
        cs.setFont(font, size);
        cs.newLineAtOffset(x, y);
        cs.showText(s == null ? "" : s);
        cs.endText();
        return y;
    }

    private float summaryRow(PDPageContentStream cs, PDFont font, float x, float y, String label, String value) throws IOException {
        text(cs, font, 9.5f, x, y, label);
        text(cs, font, 9.5f, x + 100, y, value);
        return y - 14;
    }

    private float line(PDPageContentStream cs, float y) throws IOException {
        cs.moveTo(MARGIN, y);
        cs.lineTo(PAGE_WIDTH - MARGIN, y);
        cs.stroke();
        return y;
    }

    private String nz(Object o) {
        return o == null ? "-" : o.toString();
    }

    private BigDecimal nz0(BigDecimal v) {
        return v != null ? v : BigDecimal.ZERO;
    }

    private String money(BigDecimal v) {
        return "Rs " + (v != null ? v.setScale(2, java.math.RoundingMode.HALF_UP) : "0.00");
    }

    private String truncate(String s, int max) {
        return s.length() > max ? s.substring(0, max - 1) + "..." : s;
    }
}
