// Validation utilities

export const validateEmail = (email) => {
  // Regular expression for email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePhoneNumber = (phoneNumber) => {
  // Regular expression for phone number (international format)
  // Accepts: +1234567890, +1-234-567-8900, etc.
  const phoneRegex = /^\+[1-9]\d{1,14}$/;
  return phoneRegex.test(phoneNumber);
};

export const validatePassword = (password) => {
  // Password must be at least 6 characters
  return password && password.length >= 6;
};

export const validateAmount = (amount) => {
  // Amount must be a positive number
  const num = parseFloat(amount);
  return !isNaN(num) && num > 0;
};

export const validateSMSCode = (code) => {
  // SMS code must be exactly 6 digits
  const codeRegex = /^\d{6}$/;
  return codeRegex.test(code);
};