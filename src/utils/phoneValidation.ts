
export const validateIranianPhone = (phoneNumber: string): boolean => {
  const iranPhoneRegex = /^(\+98|0098|98|0)?9[0-9]{9}$/;
  return iranPhoneRegex.test(phoneNumber);
};

export const formatPhoneNumber = (phoneNumber: string): string => {
  // Remove any country code prefixes and normalize to 09xxxxxxxxx format
  return phoneNumber.replace(/^(\+98|0098|98)/, '0');
};

export const formatPhoneToE164 = (phoneNumber: string): string => {
  // Remove all non-digit characters
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  // Handle different Iranian phone number formats
  if (cleaned.startsWith('98') && cleaned.length === 12) {
    // Already has country code: 98912xxxxxxx
    return `+${cleaned}`;
  } else if (cleaned.startsWith('0') && cleaned.length === 11) {
    // National format: 0912xxxxxxx
    return `+98${cleaned.substring(1)}`;
  } else if (cleaned.length === 10 && cleaned.startsWith('9')) {
    // Mobile format without leading 0: 912xxxxxxx
    return `+98${cleaned}`;
  }
  
  // Return as-is if format is not recognized (shouldn't happen with proper validation)
  return phoneNumber;
};
