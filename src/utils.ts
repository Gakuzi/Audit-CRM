// src/utils.ts

/**
 * Formats a phone number string for use in tel:, wa.me, or t.me links.
 * Strips all non-digit characters.
 * Replaces a leading '8' with '7' for Russian numbers if the total length is 11.
 * @param phone The raw phone number string.
 * @returns A string containing only digits, formatted for international links.
 */
export const formatPhoneForLink = (phone: string | undefined): string => {
    if (!phone) return '';
    // Strip all non-digit characters
    let digits = phone.replace(/\D/g, '');
    // If the number is a Russian mobile number starting with 8, replace it with 7
    if (digits.length === 11 && digits.startsWith('8')) {
        return '7' + digits.substring(1);
    }
    // For other cases, just return the digits
    return digits;
};