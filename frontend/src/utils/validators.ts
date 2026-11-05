export const INVALID_EMAIL_MESSAGE =
  'Enter a valid email address, for example name@gmail.com.';
export const INVALID_PHONE_MESSAGE =
  'Phone number must be 11 digits, for example 03001234567.';
export const INVALID_ROLL_NUMBER_MESSAGE =
  'Roll number must be 3 to 15 digits, for example 24004376045.';
export const INVALID_NAME_MESSAGE =
  'Please enter your full name (letters only, at least 2 characters).';
export const INVALID_INTEGER_MESSAGE =
  'Enter a whole number in the allowed range, for example 25.';
export const INVALID_MONEY_MESSAGE =
  'Amount must be between 0 and 1000000 with at most 2 decimal places.';
export const INVALID_RECEIPT_TYPE_MESSAGE =
  'Upload a PDF, JPG or PNG file up to 5 MB.';
export const INVALID_RECEIPT_SIZE_MESSAGE =
  'Upload a PDF, JPG or PNG file up to 5 MB.';

export function isValidEmail(value: string): boolean {
  const trimmed = value.trim().toLowerCase();
  return (
    trimmed.length <= 254 &&
    !/\s/.test(trimmed) &&
    !trimmed.includes('..') &&
    /^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$/.test(trimmed)
  );
}

export function normalizePhone(value: string): string {
  return value.replace(/[ \-()]/g, '');
}

export function isValidPhone(value: string): boolean {
  return /^[0-9]{11}$/.test(normalizePhone(value));
}

// This is the single place to change if roll numbers contain letters.
export const ROLL_NUMBER_PATTERN = /^[0-9]{3,15}$/;

export function isValidRollNumber(value: string): boolean {
  return ROLL_NUMBER_PATTERN.test(value.trim());
}

export function isValidName(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length >= 2 && trimmed.length <= 100 && /[A-Za-z]/.test(trimmed);
}

export function isIntegerInRange(value: string | number, min: number, max: number): boolean {
  const text = String(value).trim();
  if (!/^[0-9]+$/.test(text)) return false;
  const number = Number(text);
  return Number.isInteger(number) && number >= min && number <= max;
}

export function isMoney(value: string | number): boolean {
  const text = String(value).trim();
  if (!/^(?:0|[0-9]+)(?:\.[0-9]{1,2})?$/.test(text)) return false;
  const number = Number(text);
  return Number.isFinite(number) && number >= 0 && number <= 1000000;
}

export function validateReceiptFile(file: File): string | null {
  if (file.size > 5 * 1024 * 1024) return INVALID_RECEIPT_SIZE_MESSAGE;
  const extension = file.name.toLowerCase().split('.').pop() || '';
  const allowed = new Set(['pdf', 'jpg', 'jpeg', 'png']);
  const mimeByExtension: Record<string, string[]> = {
    pdf: ['application/pdf'],
    jpg: ['image/jpeg'],
    jpeg: ['image/jpeg'],
    png: ['image/png'],
  };
  if (!allowed.has(extension) || !mimeByExtension[extension].includes(file.type)) {
    return INVALID_RECEIPT_TYPE_MESSAGE;
  }
  return null;
}

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

export function phoneChars(value: string): string {
  return value.replace(/\D/g, '').slice(0, 11);
}
