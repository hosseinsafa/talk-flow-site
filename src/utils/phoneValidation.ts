
export const validateIranianPhone = (phoneNumber: string): boolean => {
  const iranPhoneRegex = /^(\+98|0098|98|0)?9[0-9]{9}$/;
  return iranPhoneRegex.test(phoneNumber);
};

export const formatPhoneNumber = (phoneNumber: string): string => {
  // Remove any country code prefixes and normalize to 09xxxxxxxxx format
  return phoneNumber.replace(/^(\+98|0098|98)/, '0');
};
