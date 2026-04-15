export interface CountryConfig {
    code: string;
    name: string;
    dialCode: string;
    flag: string;
    minLength: number;
    maxLength: number;
    placeholder: string;
}

export const COUNTRY_DATA: CountryConfig[] = [
    { code: 'MA', name: 'Morocco', dialCode: '+212', flag: '🇲🇦', minLength: 9, maxLength: 9, placeholder: '6 00 00 00 00' },
    { code: 'FR', name: 'France', dialCode: '+33', flag: '🇫🇷', minLength: 9, maxLength: 9, placeholder: '6 00 00 00 00' },
    { code: 'ES', name: 'Spain', dialCode: '+34', flag: '🇪🇸', minLength: 9, maxLength: 9, placeholder: '6 00 00 00 00' },
    { code: 'IT', name: 'Italy', dialCode: '+39', flag: '🇮🇹', minLength: 9, maxLength: 10, placeholder: '300 000 0000' },
    { code: 'GB', name: 'United Kingdom', dialCode: '+44', flag: '🇬🇧', minLength: 10, maxLength: 10, placeholder: '7000 000000' },
    { code: 'BE', name: 'Belgium', dialCode: '+32', flag: '🇧🇪', minLength: 8, maxLength: 9, placeholder: '400 00 00 00' },
    { code: 'NL', name: 'Netherlands', dialCode: '+31', flag: '🇳🇱', minLength: 9, maxLength: 9, placeholder: '6 00000000' },
    { code: 'US', name: 'United States', dialCode: '+1', flag: '🇺🇸', minLength: 10, maxLength: 10, placeholder: '201 555 0123' },
    { code: 'CA', name: 'Canada', dialCode: '+1', flag: '🇨🇦', minLength: 10, maxLength: 10, placeholder: '416 555 0123' },
    { code: 'DE', name: 'Germany', dialCode: '+49', flag: '🇩🇪', minLength: 10, maxLength: 11, placeholder: '150 0000000' },
];

/**
 * Clean a phone number by removing non-digits
 */
export const cleanPhoneNumber = (phone: string): string => {
    return phone.replace(/\D/g, '');
};

/**
 * Format a number to E.164 (+[dialCode][number])
 */
export const formatToE164 = (number: string, dialCode: string): string => {
    let clean = cleanPhoneNumber(number);
    let cleanDial = cleanPhoneNumber(dialCode);
    
    // If number starts with dial code, remove it first to avoid duplication
    if (clean.startsWith(cleanDial)) {
        clean = clean.slice(cleanDial.length);
    }
    
    // Remove leading zero if present
    if (clean.startsWith('0')) {
        clean = clean.slice(1);
    }
    
    return `+${cleanDial}${clean}`;
};

/**
 * Format an E.164 number for WhatsApp (digits only)
 */
export const formatForWhatsApp = (e164: string): string => {
    return cleanPhoneNumber(e164);
};

/**
 * Simple validation based on length rules
 */
export const validatePhone = (number: string, country: CountryConfig): boolean => {
    let clean = cleanPhoneNumber(number);
    
    // Remove leading zero for length check
    if (clean.startsWith('0')) {
        clean = clean.slice(1);
    }
    
    const len = clean.length;
    return len >= country.minLength && len <= country.maxLength;
};

/**
 * Extracts country info from an E.164 number
 */
export const getCountryFromE164 = (e164: string): CountryConfig | undefined => {
    if (!e164.startsWith('+')) return undefined;
    
    // Sort by dialCode length descending to match longest first (e.g., +1 242 vs +1)
    const sorted = [...COUNTRY_DATA].sort((a, b) => b.dialCode.length - a.dialCode.length);
    
    for (const country of sorted) {
        if (e164.startsWith(country.dialCode)) {
            return country;
        }
    }
    
    return undefined;
};

/**
 * Extracts the local part of the number from an E.164 number
 */
export const getLocalPart = (e164: string, dialCode: string): string => {
    let clean = cleanPhoneNumber(e164);
    let cleanDial = cleanPhoneNumber(dialCode);
    
    if (clean.startsWith(cleanDial)) {
        return clean.slice(cleanDial.length);
    }
    
    return clean;
};
