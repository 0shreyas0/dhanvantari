const DEFAULT_GST_RATE_PERCENT = 12

export type BillSummary = {
  subtotalAmount: number
  gstRate: number
  gstAmount: number
  totalAmount: number
}

function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export function calculateBillSummaryFromInclusiveTotal(
  totalAmount: number,
  gstRatePercent = DEFAULT_GST_RATE_PERCENT
): BillSummary {
  const total = roundCurrency(totalAmount)

  if (gstRatePercent <= 0) {
    return {
      subtotalAmount: total,
      gstRate: 0,
      gstAmount: 0,
      totalAmount: total,
    }
  }

  const subtotalAmount = roundCurrency(total / (1 + gstRatePercent / 100))
  const gstAmount = roundCurrency(total - subtotalAmount)

  return {
    subtotalAmount,
    gstRate: gstRatePercent,
    gstAmount,
    totalAmount: total,
  }
}

export function calculateBillSummaryFromItems(
  items: { price: number; quantity: number }[],
  gstRatePercent = DEFAULT_GST_RATE_PERCENT
): BillSummary {
  const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  return calculateBillSummaryFromInclusiveTotal(totalAmount, gstRatePercent)
}
