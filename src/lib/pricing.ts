import { SubService, SERVICES_HIERARCHY } from '@/config/services_config';

export interface PricingBreakdown {
    basePrice: number;
    quantity: number;
    unit: string;
    subtotal: number;
    serviceFee: number;
    travelFee: number; // New: traveling distance cost
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
        distanceKm?: number; // New: travel distance
        // TV Mounting specific
        tvCount?: number;
        mountTypes?: string[];
        wallMaterial?: string;
        liftingHelp?: string;
        mountingAddOns?: string[];
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

    // Apply specialized cleaning coefficients
    if (subServiceId === 'family_home') {
        basePrice *= 2.0;
    } else if (subServiceId === 'deep_cleaning') {
        basePrice *= 3.0;
    }

    let quantity = 1;
    let unit = 'job';
    let extraFees = 0;

    // Specialized TV Mounting Pricing
    if (subServiceId === 'tv_mounting') {
        // Base: 1.5 hours per TV at Bricoler rate
        quantity = options.tvCount || 1;
        unit = 'TV';
        basePrice = providerRate * 1.5;

        // Mount Multiplier
        let mountMultiplier = 1.0;
        if (options.mountTypes?.some(t => t.includes('Articulating'))) mountMultiplier = 1.3;
        else if (options.mountTypes?.some(t => t.includes('Tilting'))) mountMultiplier = 1.1;
        basePrice *= mountMultiplier;

        // Wall Multiplier
        let wallMultiplier = 1.0;
        if (options.wallMaterial?.includes('Brick') || options.wallMaterial?.includes('concrete')) wallMultiplier = 1.2;
        else if (options.wallMaterial?.includes('Metal')) wallMultiplier = 1.4;
        basePrice *= wallMultiplier;

        // Lifting Help Fee
        if (options.liftingHelp === 'no_60') {
            extraFees += 50; // Extra MAD for heavy handling alone or requiring complexity
        }

        // Add-ons
        if (options.mountingAddOns?.includes('wires')) extraFees += 40;
        if (options.mountingAddOns?.includes('audio')) extraFees += 30;
        if (options.mountingAddOns?.includes('setup')) extraFees += 20;

    } else {
        // 2. Apply Standard Archetype Logic
        switch (archetype) {
            case 'unit':
                // For cleaning/painting, quantity is typically room count
                quantity = options.rooms || options.quantity || 1;
                unit = subServiceId.includes('cleaning') || subServiceId.includes('hospitality') || subServiceId.includes('home') ? 'room' : 'unit';
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
    }

    const subtotal = (basePrice * quantity) + extraFees;
    const serviceFee = subtotal * 0.10; // 10% Platform fee
    const travelFee = (options.distanceKm || 0) * 3; // 3 MAD per Km
    const total = subtotal + serviceFee + travelFee;

    return {
        basePrice,
        quantity,
        unit,
        subtotal,
        serviceFee,
        travelFee,
        total
    };
};
