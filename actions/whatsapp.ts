"use server"

import twilio from "twilio"
import { getSignedPdfUrl } from "@/lib/pdf-token"

const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const fromNumber = process.env.TWILIO_PHONE_NUMBER || "whatsapp:+14155238886"

const client = twilio(accountSid, authToken)

export async function sendWhatsAppReceipt(
  to: string,
  customerName: string,
  billId: string,
  total: number,
  items: { name: string, quantity: number, price: number }[],
  pharmacyName: string
) {
  if (!accountSid || !authToken) {
    console.error("Twilio credentials missing")
    return { success: false, error: "Twilio credentials missing" }
  }

  try {
    const itemsList = items.map(item => 
      `• ${item.name} x ${item.quantity} = ₹${(item.price * item.quantity).toFixed(2)}`
    ).join('\n');

    const pdfUrl = getSignedPdfUrl(billId);

    const messageBody = `*${pharmacyName.toUpperCase()} - DIGI RECEIPT*\n` +
      `--------------------------\n` +
      `*Customer:* ${customerName || 'Valued Customer'}\n` +
      `*Receipt ID:* ${billId.slice(-6).toUpperCase()}\n` +
      `*Date:* ${new Date().toLocaleDateString()}\n\n` +
      `*Items Dispensed:*\n${itemsList}\n\n` +
      `*Total Amount: ₹${total.toFixed(2)}*\n\n` +
      `📄 *Download PDF Receipt:*\n${pdfUrl}\n\n` +
      `_Digitized by Dhanvantari ✨_`;

    // Ensure number is in E.164 format and prefixed with whatsapp:
    let formattedTo = to.replace(/\D/g, '')
    if (!formattedTo.startsWith('whatsapp:')) {
      formattedTo = `whatsapp:+${formattedTo.startsWith('91') ? '' : '91'}${formattedTo}`
    }

    const message = await client.messages.create({
      body: messageBody,
      from: fromNumber,
      to: formattedTo
    })

    console.log("WhatsApp message sent:", message.sid)
    return { success: true, sid: message.sid }
  } catch (error: any) {
    console.error("Failed to send WhatsApp message:", error)
    return { success: false, error: error.message }
  }
}
