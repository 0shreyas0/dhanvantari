export function generateEAN13(): string {
  // Prefix for internal use (20-29). We use 20.
  let code = "20";
  // Generate 10 random digits
  for (let i = 0; i < 10; i++) {
    code += Math.floor(Math.random() * 10).toString();
  }

  // Calculate Checksum
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(code[i]);
    // Even positions (2nd, 4th...) get weight 3
    // Odd positions (1st, 3rd...) get weight 1
    if ((i + 1) % 2 === 0) {
      sum += digit * 3;
    } else {
      sum += digit;
    }
  }

  const remainder = sum % 10;
  const checkDigit = remainder === 0 ? 0 : 10 - remainder;

  return code + checkDigit;
}
