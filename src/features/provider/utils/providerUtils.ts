import { SERVICE_CATEGORIES } from '../constants/ProviderConstants';

export const normalizeServiceId = (input: any): string => {
    if (!input || typeof input !== 'string') return 'general';
    const lowerInput = input.toLowerCase().trim();
    if (!lowerInput) return 'general';

    const exactMatch = SERVICE_CATEGORIES.find(s => s.id && s.id.toLowerCase() === lowerInput);
    if (exactMatch) return exactMatch.id;

    const nameMatch = SERVICE_CATEGORIES.find(s => s.name.en && s.name.en.toLowerCase() === lowerInput);
    if (nameMatch) return nameMatch.id;

    const keyMatch = SERVICE_CATEGORIES.find(s => s.id && (lowerInput.includes(s.id.toLowerCase()) || s.id.toLowerCase().includes(lowerInput)));
    if (keyMatch) return keyMatch.id;

    return lowerInput;
};

export const getFallbackJobCardImage = (serviceName: string, craft?: string): string => {
    const source = `${serviceName} ${craft || ''}`.toLowerCase();

    if (source.includes('pool') && source.includes('clean')) return '/Images/Job Cards Images/Pool%20Cleaning_job_card.webp';
    if (source.includes('paint')) return '/Images/Job Cards Images/Painting_job_card.webp';
    if (source.includes('plumb')) return '/Images/Job Cards Images/Plumbing_job_card.webp';
    if (source.includes('mov')) return '/Images/Job Cards Images/Moving%20Help_job_card.webp';
    if (source.includes('baby')) return '/Images/Job Cards Images/Babysetting_job_card.webp';
    if (source.includes('furniture') || source.includes('assembly')) return '/Images/Job Cards Images/Furniture_Assembly_job_card.webp';
    if (source.includes('garden')) return '/Images/Job Cards Images/Gardening_job_card.webp';
    if (source.includes('clean')) return '/Images/Job Cards Images/Cleaning_job_card.webp';
    if (source.includes('electr')) return '/Images/Job Cards Images/Electricity_job_card.webp';

    return '/Images/Job Cards Images/Handyman_job_card.webp';
};
