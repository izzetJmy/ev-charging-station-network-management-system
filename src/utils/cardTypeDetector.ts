export type CardType = "visa" | "mastercard" | "invalid" | null;

export function detectCardType(cardNumber: string): CardType {
  const digits = cardNumber.replace(/\D/g, "");

  if (digits.length < 4) {
    return null;
  }

  const firstDigit = digits[0];
  const firstFourDigits = parseInt(digits.slice(0, 4), 10);

  // VISA: starts with 4
  if (firstDigit === "4") {
    return "visa";
  }

  // Mastercard: starts with 5 or 2221-2720
  if (firstDigit === "5") {
    return "mastercard";
  }

  if (firstFourDigits >= 2221 && firstFourDigits <= 2720) {
    return "mastercard";
  }

  // Invalid card type
  return "invalid";
}

export function getCardTypeLabel(cardType: CardType): string {
  if (cardType === "visa") {
    return "Visa";
  }
  if (cardType === "mastercard") {
    return "Mastercard";
  }
  if (cardType === "invalid") {
    return "Hatalı Kart";
  }
  return "";
}
