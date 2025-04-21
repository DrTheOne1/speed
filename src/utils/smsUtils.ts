// Create this new utility file for SMS-related functions

/**
 * Detects if a character belongs to the GSM-7 character set
 */
const GSM_7_CHARS = "@£$¥èéùìòÇØøÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
const GSM_7_EXTENDED_CHARS = "^{}\\[~]|€";

const isGsm7Char = (char: string): boolean => {
  return GSM_7_CHARS.includes(char);
};

const isGsm7ExtendedChar = (char: string): boolean => {
  return GSM_7_EXTENDED_CHARS.includes(char);
};

/**
 * Checks if a message can be encoded using GSM-7
 */
export function isGsm7Message(message: string): boolean {
  // Basic GSM-7 character check
  const gsm7Regex = /^[A-Za-z0-9\s@£$¥èéùìòÇ\fØø\n\rÅåΔ_ΦΓΛΩΠΨΣΘΞ\^]{1,}$/;
  return gsm7Regex.test(message);
}

/**
 * Calculates effective character length considering GSM-7 extended characters count as 2
 */
export const getEffectiveGsm7Length = (message: string): number => {
  return [...message].reduce((length, char) => {
    return length + (isGsm7ExtendedChar(char) ? 2 : 1);
  }, 0);
};

/**
 * Calculate the number of segments (parts) a message will be split into
 * @param message The SMS message text  
 * @param maxSegments Maximum number of segments allowed (default: 5)
 */
export const calculateMessageSegments = (message: string, maxSegments: number = 5): number => {
  if (!message) return 0;
  
  // Check encoding type
  const isGsm = isGsm7Message(message);
  
  // Different character limits based on encoding
  const singleSegmentLimit = isGsm ? 160 : 70;
  const multiSegmentLimit = isGsm ? 153 : 67; // Concatenated messages have slightly reduced capacity
  
  // Get effective length based on encoding
  const effectiveLength = isGsm ? getEffectiveGsm7Length(message) : message.length;
  
  // Calculate segments
  if (effectiveLength <= singleSegmentLimit) {
    return 1;
  } else {
    const calculatedSegments = Math.ceil(effectiveLength / multiSegmentLimit);
    return Math.min(calculatedSegments, maxSegments); // Limit to maxSegments
  }
};

/**
 * Calculate the number of credits required for sending a message
 * @param message The message text
 * @param recipientCount Number of recipients
 * @param maxSegments Maximum number of segments allowed (default: 5)
 * @returns Total credits required
 */
export function calculateRequiredCredits(message: string, recipientCount: number): number {
  const { segments } = getMessageDetails(message);
  return segments * recipientCount;
}

/**
 * Gets message details for UI display
 * @param message The SMS message text
 * @param maxPages Maximum number of pages allowed (default: 5)
 */
export function getMessageDetails(message: string, maxPages: number = 5) {
  const isGsm = isGsm7Message(message);
  const charsPerSegment = isGsm ? 160 : 70;
  const multiPageCharsPerSegment = isGsm ? 153 : 67;
  const totalChars = message.length;
  
  let segments = 1;
  if (totalChars > charsPerSegment) {
    segments = Math.ceil((totalChars - charsPerSegment) / multiPageCharsPerSegment) + 1;
  }
  
  const maxChars = charsPerSegment + ((maxPages - 1) * multiPageCharsPerSegment);
  const exceedsLimit = segments > maxPages;
  
  let remaining = charsPerSegment - totalChars;
  if (segments > 1) {
    remaining = (segments * multiPageCharsPerSegment) - totalChars;
  }
  
  return {
    segments,
    remaining,
    isGsm,
    charsPerSegment,
    totalChars,
    maxChars,
    exceedsLimit
  };
}