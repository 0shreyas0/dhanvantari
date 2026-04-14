"use server"

import nodemailer from "nodemailer"
import { getSignedPdfUrl } from "@/lib/pdf-token"

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT) || 587,
  secure: process.env.EMAIL_SECURE === "true", // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
})

export async function sendEmailReceipt(
  to: string,
  customerName: string,
  billId: string,
  total: number,
  items: { name: string, quantity: number, price: number }[],
  pharmacyName: string
) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error("Email credentials missing")
    return { success: false, error: "Email credentials missing" }
  }

  try {
    const itemsHtml = items.map(item => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.name}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">₹${(item.price * item.quantity).toFixed(2)}</td>
      </tr>
    `).join('');

    const pdfUrl = getSignedPdfUrl(billId);

    const htmlContent = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #0f172a; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">${pharmacyName}</h1>
          <p style="margin: 5px 0 0 0; opacity: 0.8;">Digital Purchase Receipt</p>
        </div>
        <div style="padding: 30px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <a href="${pdfUrl}" style="background-color: #0ea5e9; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">⬇️ Download PDF Receipt</a>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
            <div>
              <p style="margin: 0; color: #64748b; font-size: 14px;">BILL TO:</p>
              <h3 style="margin: 5px 0 0 0;">${customerName || 'Valued Customer'}</h3>
            </div>
            <div style="text-align: right;">
              <p style="margin: 0; color: #64748b; font-size: 14px;">BILL ID:</p>
              <h3 style="margin: 5px 0 0 0;">#${billId.slice(-8).toUpperCase()}</h3>
            </div>
          </div>
          
          <table style="width: 100%; border-collapse: collapse; margin-top: 30px;">
            <thead>
              <tr style="background-color: #f8fafc;">
                <th style="padding: 10px; text-align: left; border-bottom: 2px solid #e2e8f0;">Item</th>
                <th style="padding: 10px; text-align: center; border-bottom: 2px solid #e2e8f0;">Qty</th>
                <th style="padding: 10px; text-align: right; border-bottom: 2px solid #e2e8f0;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="2" style="padding: 20px 10px; text-align: right; font-weight: bold; font-size: 18px;">Total Paid:</td>
                <td style="padding: 20px 10px; text-align: right; font-weight: bold; font-size: 18px; color: #020617;">₹${total.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
          
          <div style="margin-top: 40px; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 20px;">
            <p style="color: #64748b; font-size: 14px; margin-bottom: 5px;">Thank you for choosing <strong>${pharmacyName}</strong>.</p>
            <p style="color: #94a3b8; font-size: 11px;">Need a copy? <a href="${pdfUrl}" style="color: #0ea5e9;">Download PDF</a></p>
            <p style="color: #94a3b8; font-size: 11px; margin-top: 0; display: flex; align-items: center; justify-content: center; gap: 4px;">
              Digitized by <span style="color: #0ea5e9; font-weight: bold;">Dhanvantari</span>
            </p>
          </div>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: `"${pharmacyName}" <${process.env.EMAIL_USER}>`,
      to,
      subject: `Your receipt from ${pharmacyName} (#${billId.slice(-6).toUpperCase()})`,
      html: htmlContent,
    })

    return { success: true }
  } catch (error: any) {
    console.error("Failed to send email receipt:", error)
    return { success: false, error: error.message }
  }
}
