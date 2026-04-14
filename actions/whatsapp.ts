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
  totals: {
    subtotalAmount: number
    gstAmount: number
    gstRate: number
    totalAmount: number
  },
  items: { name: string, quantity: number, price: number }[],
  pharmacyName: string
) {
  if (!accountSid || !authToken) {
    console.error("Twilio credentials missing")
    return { success: false, error: "Twilio credentials missing" }
  }

  // Fetch store details
  const { prisma } = await import("@/lib/prisma")
  const { auth } = await import("@clerk/nextjs/server")
  const { userId } = await auth()
  
  const settings = userId ? await prisma.pharmacySettings.findUnique({
    where: { userId },
  }) : null

  const storeAddress = settings?.address || ""
  const storePhone = settings?.phone || ""

  try {
    const itemsList = items.map(item => 
      `• ${item.name} x ${item.quantity} = ₹${(item.price * item.quantity).toFixed(2)}`
    ).join('\n');

    const pdfUrl = getSignedPdfUrl(billId);

    const messageBody = `*${pharmacyName.toUpperCase()} - DIGI RECEIPT*\n` +
      `${storeAddress ? `_${storeAddress}${storePhone ? ` • ${storePhone}` : ''}_\n` : ''}` +
      `--------------------------\n` +
      `*Customer:* ${customerName || 'Valued Customer'}\n` +
      `*Receipt ID:* ${billId.slice(-6).toUpperCase()}\n` +
      `*Date:* ${new Date().toLocaleDateString()}\n\n` +
      `*Items Dispensed:*\n${itemsList}\n\n` +
      `Subtotal: ₹${totals.subtotalAmount.toFixed(2)}\n` +
      `GST (${totals.gstRate.toFixed(0)}%): ₹${totals.gstAmount.toFixed(2)}\n` +
      `*Total Amount: ₹${totals.totalAmount.toFixed(2)}*\n\n` +
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
  } catch (error: unknown) {
    console.error("Failed to send WhatsApp message:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown WhatsApp error",
    }
  }
}
