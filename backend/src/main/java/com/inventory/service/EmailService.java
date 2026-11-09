package com.inventory.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import jakarta.mail.internet.MimeMessage;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${app.mail.enabled:false}") private boolean enabled;
    @Value("${app.mail.from-address:noreply@inventorypro.com}") private String fromAddress;
    @Value("${app.mail.from-name:InventoryPro}") private String fromName;

    @Async
    public void sendInvoiceEmail(String toEmail, String customerName, String invoiceNumber,
                                  String businessName, double totalAmount, String saleDate) {
        if (!enabled || toEmail == null || toEmail.isBlank()) {
            log.debug("Email disabled or no recipient — skipping invoice email");
            return;
        }
        try {
            MimeMessage msg = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(msg, true, "UTF-8");
            helper.setFrom(fromAddress, fromName);
            helper.setTo(toEmail);
            helper.setSubject("Invoice " + invoiceNumber + " from " + businessName);
            helper.setText(buildInvoiceHtml(customerName, invoiceNumber, businessName, totalAmount, saleDate), true);
            mailSender.send(msg);
            log.info("Invoice email sent to {} for invoice {}", toEmail, invoiceNumber);
        } catch (Exception e) {
            log.error("Failed to send invoice email to {}: {}", toEmail, e.getMessage());
        }
    }

    @Async
    public void sendDigestEmail(String toEmail, String subject, String htmlBody) {
        if (!enabled || toEmail == null || toEmail.isBlank()) return;
        try {
            MimeMessage msg = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(msg, true, "UTF-8");
            helper.setFrom(fromAddress, fromName);
            helper.setTo(toEmail);
            helper.setSubject(subject);
            helper.setText(htmlBody, true);
            mailSender.send(msg);
            log.info("Digest email sent to {}", toEmail);
        } catch (Exception e) {
            log.error("Failed to send digest to {}: {}", toEmail, e.getMessage());
        }
    }

    private String buildInvoiceHtml(String customer, String invoiceNo, String business, double total, String date) {
        return """  
            <!DOCTYPE html>
            <html>
            <head><meta charset=UTF-8><style>
              body{font-family:Inter,Arial,sans-serif;background:#f8fafc;margin:0;padding:20px}
              .card{max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)}
              .header{background:linear-gradient(135deg,#6366f1,#a855f7);padding:32px;text-align:center;color:#fff}
              .header h1{margin:0;font-size:24px;font-weight:700}  
              .header p{margin:8px 0 0;opacity:.85;font-size:14px}
              .body{padding:32px}
              .row{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:14px}
              .label{color:#64748b}.value{font-weight:600;color:#1e293b}
              .total-row{background:#f8fafc;border-radius:12px;padding:16px;margin:20px 0;display:flex;justify-content:space-between;align-items:center}
              .total-label{font-size:16px;font-weight:600;color:#1e293b}
              .total-value{font-size:24px;font-weight:700;color:#6366f1}
              .footer{background:#f8fafc;padding:20px 32px;text-align:center;font-size:12px;color:#94a3b8}
              .btn{display:inline-block;background:linear-gradient(135deg,#6366f1,#a855f7);color:#fff;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px;margin-top:16px}
            </style></head>
            <body>
            <div class=card>
              <div class=header>
                <h1>%s</h1>
                <p>Tax Invoice</p>
              </div>
              <div class=body>
                <div class=row><span class=label>Invoice Number</span><span class=value>%s</span></div>
                <div class=row><span class=label>Date</span><span class=value>%s</span></div>
                <div class=row><span class=label>Customer</span><span class=value>%s</span></div>
                <div class=total-row>
                  <span class=total-label>Total Amount</span>
                  <span class=total-value>₹%.2f</span>
                </div>
                <div style=text-align:center>
                  <p style=color:#64748b;font-size:14px>Thank you for your business! 🙏</p>
                </div>
              </div>
              <div class=footer>Powered by InventoryPro — Smart Inventory &amp; Billing</div>
            </div>
            </body></html>
            """.formatted(business, invoiceNo, date, customer, total);
    }
}
