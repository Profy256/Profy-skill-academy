package com.profy256.profy.modules.progress.service;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.WriterException;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import com.profy256.profy.modules.progress.entity.Certificate;
import com.profy256.profy.modules.progress.entity.CertificateSettings;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDFont;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.springframework.stereotype.Component;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.Base64;

/**
 * Renders a certificate to PDF (and PNG) entirely on the server.
 *
 * Layout, wording and colours all come from the admin-editable
 * {@link CertificateSettings} row, so re-branding the certificate is a
 * settings change — no deploy required.
 */
@Component
public class CertificatePdfRenderer {

    private static final PDFont SANS = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
    private static final PDFont SANS_BOLD = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
    private static final PDFont SERIF = new PDType1Font(Standard14Fonts.FontName.TIMES_ROMAN);
    private static final PDFont SERIF_BOLD = new PDType1Font(Standard14Fonts.FontName.TIMES_BOLD);
    private static final PDFont MONO = new PDType1Font(Standard14Fonts.FontName.COURIER);

    private static final DateTimeFormatter DATE_FORMAT =
            DateTimeFormatter.ofPattern("d MMMM yyyy").withZone(ZoneOffset.UTC);

    public byte[] renderPdf(Certificate cert, CertificateSettings s, String verifyUrl) throws IOException {
        boolean landscape = !"portrait".equals(s.getCertPaperSize());
        PDRectangle size = landscape
                ? new PDRectangle(792, 612)   // US Letter landscape
                : new PDRectangle(612, 792);  // US Letter portrait

        try (PDDocument doc = new PDDocument()) {
            PDPage page = new PDPage(size);
            doc.addPage(page);

            int primary = rgb(s.getCertPrimaryColor());
            int accent = rgb(s.getCertAccentColor());

            try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
                drawBorder(cs, size, primary, accent);
                drawBody(doc, cs, size, cert, s, verifyUrl, primary, accent);
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            doc.save(out);
            return out.toByteArray();
        }
    }

    public byte[] renderPng(Certificate cert, CertificateSettings s, String verifyUrl) throws IOException {
        try (PDDocument doc = new PDDocument()) {
            boolean landscape = !"portrait".equals(s.getCertPaperSize());
            PDRectangle size = landscape
                    ? new PDRectangle(792, 612)
                    : new PDRectangle(612, 792);
            PDPage page = new PDPage(size);
            doc.addPage(page);

            int primary = rgb(s.getCertPrimaryColor());
            int accent = rgb(s.getCertAccentColor());
            try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
                drawBorder(cs, size, primary, accent);
                drawBody(doc, cs, size, cert, s, verifyUrl, primary, accent);
            }

            // 150 DPI gives a crisp print/share image without a huge file.
            BufferedImage image = new PDFRenderer(doc).renderImageWithDPI(0, 150);
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            ImageIO.write(image, "png", out);
            return out.toByteArray();
        }
    }

    // ─── Drawing ────────────────────────────────────────────────────

    private void drawBorder(PDPageContentStream cs, PDRectangle size, int primary, int accent)
            throws IOException {
        float w = size.getWidth();
        float h = size.getHeight();

        // Outer rule
        cs.setStrokingColor(new java.awt.Color(primary));
        cs.setLineWidth(3f);
        cs.addRect(20, 20, w - 40, h - 40);
        cs.stroke();

        // Inner accent rule
        cs.setStrokingColor(new java.awt.Color(accent));
        cs.setLineWidth(1f);
        cs.addRect(30, 30, w - 60, h - 60);
        cs.stroke();

        // Corner accents
        cs.setLineWidth(2.5f);
        float corner = 46f;
        // top-left
        cs.moveTo(30, 30 + corner); cs.lineTo(30, 30); cs.lineTo(30 + corner, 30);
        // top-right
        cs.moveTo(w - 30 - corner, 30); cs.lineTo(w - 30, 30); cs.lineTo(w - 30, 30 + corner);
        // bottom-right
        cs.moveTo(w - 30, h - 30 - corner); cs.lineTo(w - 30, h - 30); cs.lineTo(w - 30 - corner, h - 30);
        // bottom-left
        cs.moveTo(30 + corner, h - 30); cs.lineTo(30, h - 30); cs.lineTo(30, h - 30 - corner);
        cs.stroke();
    }

    private void drawBody(PDDocument document, PDPageContentStream cs, PDRectangle size, Certificate cert,
                          CertificateSettings s, String verifyUrl,
                          int primary, int accent) throws IOException {
        float w = size.getWidth();
        float cx = w / 2f;
        float top = size.getHeight() - 46f;
        boolean landscape = !"portrait".equals(s.getCertPaperSize());

        // Organisation name
        top -= 6;
        center(cs, s.getCertOrgName(), SANS_BOLD, 10, cx, top, accent);
        top -= 6;
        rule(cs, cx - 60, cx + 60, top, accent, 1.2f);
        top -= 34;

        // Heading
        center(cs, s.getCertHeading(), SERIF_BOLD, landscape ? 30 : 26, cx, top, primary);
        top -= 40;

        // Intro line
        center(cs, s.getCertIntro(), SERIF, 13, cx, top, 0x333333);
        top -= 44;

        // Recipient name — the hero of the document
        String name = cert.getRecipientName() != null ? cert.getRecipientName() : "";
        center(cs, name, SERIF_BOLD, landscape ? 36 : 30, cx, top, primary);
        top -= 34;

        // Rule under the name
        float nameHalf = Math.min(textWidth(name, SERIF_BOLD, landscape ? 36 : 30) / 2f, w / 2f - 90);
        rule(cs, cx - nameHalf, cx + nameHalf, top + 8, accent, 1f);
        top -= 24;

        center(cs, s.getCertAchieved(), SERIF, 13, cx, top, 0x333333);
        top -= 44;

        // Course
        center(cs, s.getCertCourseLabel().toUpperCase(), SANS_BOLD, 8.5f, cx, top, accent);
        top -= 20;
        center(cs, cert.getCourseName() != null ? cert.getCourseName() : "", SERIF_BOLD,
                landscape ? 19 : 17, cx, top, 0x1a1a1a);
        top -= 42;

        // Score + date, two columns
        float colGap = landscape ? 170 : 130;
        float leftCol = cx - colGap;
        float rightCol = cx + colGap;

        String scoreText = cert.getScore() != null && cert.getTotal() != null
                ? cert.getScore() + " / " + cert.getTotal()
                        + (cert.getPassPercent() != null ? "  (" + cert.getPassPercent() + "% to pass)" : "")
                : "—";
        String dateText = cert.getIssuedAt() != null
                ? DATE_FORMAT.format(cert.getIssuedAt()) : "—";

        labelValue(cs, s.getCertScoreLabel(), scoreText, leftCol, top, primary);
        labelValue(cs, s.getCertDateLabel(), dateText, rightCol, top, primary);
        top -= 52;

        // Credential ID
        center(cs, s.getCertCodeLabel() + "  " + cert.getCertCode(), MONO, 9.5f, cx, top, 0x555555);
        top -= 26;

        // Verify footer
        center(cs, s.getCertFooter(), SANS, 9, cx, top, 0x666666);
        top -= 14;
        center(cs, verifyUrl, SANS_BOLD, 9, cx, top, primary);
        top -= 46;

        // Signature block (left) — decorative only, no fake seal claims.
        float sigY = 62f;
        float sigX = landscape ? 90f : 70f;
        float sigWidth = landscape ? 220f : 180f;

        cs.setStrokingColor(new java.awt.Color(0x888888));
        cs.setLineWidth(0.8f);
        cs.moveTo(sigX, sigY + 26);
        cs.lineTo(sigX + sigWidth, sigY + 26);
        cs.stroke();

        leftText(cs, s.getCertSignatureName(), SERIF_BOLD, 12, sigX, sigY + 10, 0x1a1a1a);
        leftText(cs, s.getCertSignatureTitle(), SANS, 8.5f, sigX, sigY - 4, 0x666666);

        // QR (right) — links to the public verification page.
        if (Boolean.TRUE.equals(s.getCertShowQr()) && verifyUrl != null && !verifyUrl.isBlank()) {
            float qrSize = 64f;
            float qrX = landscape ? w - 90f - qrSize : cx - qrSize / 2f;
            float qrY = landscape ? 54f : 40f;
            try {
                byte[] png = qrPng(verifyUrl, 220);
                PDImageXObject image = PDImageXObject.createFromByteArray(document, png, "verify-qr");
                cs.drawImage(image, qrX, qrY, qrSize, qrSize);
            } catch (Exception e) {
                // A missing QR must never break the download.
            }
        }
    }

    // ─── Helpers ────────────────────────────────────────────────────

    private void center(PDPageContentStream cs, String text, PDFont font, float size,
                        float cx, float y, int color) throws IOException {
        String safe = sanitize(text);
        if (safe.isEmpty()) return;
        float width = textWidth(safe, font, size);
        cs.beginText();
        cs.setFont(font, size);
        cs.setNonStrokingColor(new java.awt.Color(color));
        cs.newLineAtOffset(cx - width / 2f, y);
        cs.showText(safe);
        cs.endText();
    }

    private void leftText(PDPageContentStream cs, String text, PDFont font, float size,
                          float x, float y, int color) throws IOException {
        String safe = sanitize(text);
        if (safe.isEmpty()) return;
        cs.beginText();
        cs.setFont(font, size);
        cs.setNonStrokingColor(new java.awt.Color(color));
        cs.newLineAtOffset(x, y);
        cs.showText(safe);
        cs.endText();
    }

    private void labelValue(PDPageContentStream cs, String label, String value,
                            float cx, float y, int color) throws IOException {
        center(cs, label.toUpperCase(), SANS_BOLD, 7.5f, cx, y, 0x888888);
        center(cs, value, SANS_BOLD, 13, cx, y - 18, color);
    }

    private void rule(PDPageContentStream cs, float x1, float x2, float y,
                      int color, float width) throws IOException {
        cs.setStrokingColor(new java.awt.Color(color));
        cs.setLineWidth(width);
        cs.moveTo(x1, y);
        cs.lineTo(x2, y);
        cs.stroke();
    }

    private float textWidth(String text, PDFont font, float size) throws IOException {
        return font.getStringWidth(text) / 1000f * size;
    }

    /**
     * The standard-14 fonts are WinAnsi-encoded; anything outside Latin-1
     * would throw during showText. Fall back to a neutral glyph instead of
     * failing the whole download.
     */
    private String sanitize(String text) {
        if (text == null) return "";
        StringBuilder sb = new StringBuilder(text.length());
        for (char c : text.toCharArray()) {
            sb.append(c >= 0x20 && c <= 0xFF ? c : ' ');
        }
        return sb.toString().trim();
    }

    private int rgb(String hex) {
        if (hex == null || hex.length() < 7) return 0x1f3a8a;
        try {
            return Integer.parseInt(hex.substring(1), 16);
        } catch (NumberFormatException e) {
            return 0x1f3a8a;
        }
    }

    private byte[] qrPng(String content, int size) throws WriterException, IOException {
        BitMatrix matrix = new QRCodeWriter().encode(content, BarcodeFormat.QR_CODE, size, size);
        BufferedImage img = new BufferedImage(size, size, BufferedImage.TYPE_INT_RGB);
        for (int y = 0; y < size; y++) {
            for (int x = 0; x < size; x++) {
                img.setRGB(x, y, matrix.get(x, y) ? 0x000000 : 0xFFFFFF);
            }
        }
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(img, "png", out);
        return out.toByteArray();
    }

    /** Unused, kept so callers can hand a base64 QR to a custom template later. */
    public String qrDataUri(String content) {
        try {
            return "data:image/png;base64," + Base64.getEncoder().encodeToString(qrPng(content, 220));
        } catch (Exception e) {
            return "";
        }
    }
}
