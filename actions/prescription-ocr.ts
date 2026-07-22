"use server"

import { GoogleGenAI } from "@google/genai"

export interface ExtractedMedicine {
  name: string       // cleaned name e.g. "Amoxicillin"
  rawText: string    // original text from prescription e.g. "Tab. Amoxicillin 500mg"
}

export interface PrescriptionOcrResult {
  success: boolean
  medicines: ExtractedMedicine[]
  error?: string
}

/**
 * Uses Gemini Flash Vision to extract medicine names from a prescription image.
 * The image is fetched server-side from its UploadThing CDN URL.
 */
export async function extractMedicinesFromPrescription(
  imageUrl: string
): Promise<PrescriptionOcrResult> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return {
      success: false,
      medicines: [],
      error: "GEMINI_API_KEY is not configured. Add it to your .env file.",
    }
  }

  try {
    // Fetch image from CDN and convert to base64
    const response = await fetch(imageUrl)
    if (!response.ok) {
      throw new Error(`Failed to fetch prescription image: ${response.statusText}`)
    }
    const imageBuffer = await response.arrayBuffer()
    const base64Image = Buffer.from(imageBuffer).toString("base64")
    const mimeType = response.headers.get("content-type") || "image/jpeg"

    const ai = new GoogleGenAI({ apiKey })

    const result = await ai.models.generateContent({
      model: "gemini-flash-latest",
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType,
                data: base64Image,
              },
            },
            {
              text: `You are a pharmacist assistant. Look at this prescription image and extract all medicine/drug names.

Rules:
- Return ONLY medicine/drug names, not dosages, frequencies, or patient details
- Clean up abbreviations: "Tab." → just the drug name, "Syp." → just the drug name, "Cap." → just the drug name  
- Return the generic/brand name only (e.g. "Amoxicillin" not "Tab. Amoxicillin 500mg – 1-0-1 x 7 days")
- Also include the rawText (the full line as written in the prescription for that medicine)
- If no medicines are found, return an empty array

Respond ONLY with a valid JSON array like this (no markdown, no explanation):
[{"name":"Amoxicillin","rawText":"Tab. Amoxicillin 500mg - 1-0-1 x 7 days"},{"name":"Paracetamol","rawText":"Tab. Paracetamol 650mg - 1-1-1 x 5 days"}]`,
            },
          ],
        },
      ],
    })

    const text = result.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? ""

    // Strip markdown code fences if present
    const cleaned = text.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "").trim()

    let medicines: ExtractedMedicine[] = []
    try {
      medicines = JSON.parse(cleaned)
      if (!Array.isArray(medicines)) medicines = []
    } catch {
      // Gemini returned something unexpected — try to salvage line-by-line
      console.warn("OCR JSON parse failed, raw:", cleaned)
      return { success: true, medicines: [], error: "Could not parse medicine list from prescription." }
    }

    return { success: true, medicines }
  } catch (err: any) {
    console.error("Prescription OCR error:", err)

    // Handle quota / rate-limit errors gracefully
    const message: string = err.message ?? ""
    const status: number = err.status ?? err.code ?? 0
    if (status === 429 || message.includes("429") || message.includes("RESOURCE_EXHAUSTED") || message.includes("quota")) {
      return {
        success: false,
        medicines: [],
        error: "Gemini API quota exceeded. Please enable billing at aistudio.google.com or try again later. Using manual search instead.",
      }
    }

    return {
      success: false,
      medicines: [],
      error: err.message ?? "Unknown error during OCR",
    }
  }
}
