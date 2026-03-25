import { SubService, SERVICES_HIERARCHY } from '@/config/services_config';

export interface PricingBreakdown {
    basePrice: number;
    quantity: number;
    unit: string;
    subtotal: number;
    serviceFee: number;
    total: number;
}

/**
 * Calculates the price for an order based on the service archetype.
 * 
 * @param subServiceId The ID of the selected subservice
 * @param providerRate The rate set by the Bricoler (hourly, per room, or fixed)
 * @param options Additional inputs like room count, hours, or days
 */
export const calculateOrderPrice = (
    subServiceId: string,
    providerRate: number,
    options: {
        rooms?: number;
        hours?: number;
        days?: number;
        quantity?: number;
        propertyType?: string;
    } = {}
): PricingBreakdown => {
    // 1. Find the subservice to get its archetype
    let archetype: string = 'hourly'; // Default
    let subSvc: SubService | undefined;

    for (const [catId, cat] of Object.entries(SERVICES_HIERARCHY)) {
        // Check if the ID matches a subservice
        subSvc = cat.subServices.find(ss => ss.id === subServiceId);
        if (subSvc) {
            archetype = subSvc.pricingArchetype || 'hourly';
            break;
        }
        // Check if the ID matches a category itself
        if (catId === subServiceId) {
            // Use the archetype of the first subservice as representative
            archetype = cat.subServices[0]?.pricingArchetype || 'hourly';
            break;
        }
    }

    let basePrice = providerRate;

    // Apply property coefficient for unit-based services (like cleaning)
    if (options.propertyType) {
        const coefMap: Record<string, number> = {
            studio: 0.9,
            apartment: 1.0,
            villa: 1.2,
            guesthouse: 1.3,
            riad: 1.4,
            hotel: 1.5
        };
        const key = options.propertyType.toLowerCase();
        const coefficient = coefMap[key];
        if (coefficient !== undefined) {
            basePrice *= coefficient;
        }
    }

    // Apply Family home cleaning coefficient (2.0x)
    if (subServiceId === 'family_home') {
        basePrice *= 2.0;
    }

    let quantity = 1;
    let unit = 'job';

    // 2. Apply Archetype Logic
    switch (archetype) {
        case 'unit':
            // For cleaning/painting, quantity is typically room count
            quantity = options.rooms || options.quantity || 1;
            unit = 'unit';
            break;
        case 'hourly':
            quantity = options.hours || options.quantity || 1;
            unit = 'hr';
            break;
        case 'rental':
            quantity = options.days || options.quantity || 1;
            unit = 'day';
            break;
        case 'fixed':
        default:
            quantity = 1;
            unit = 'fixed';
            break;
    }

    const subtotal = basePrice * quantity;
    const serviceFee = Math.round(subtotal * 0.10); // 10% Lbricol Fee
    const total = subtotal + serviceFee;

    return {
        basePrice,
        quantity,
        unit,
        subtotal,
        serviceFee,
        total
    };
};
