import { SubService, SERVICES_HIERARCHY } from '@/config/services_config';

export interface PricingBreakdown {
    basePrice: number;
    quantity: number;
    unit: string;
    subtotal: number;
    serviceFee: number;
    travelFee: number; // New: traveling distance cost
    total: number;
    distanceKm?: number;
    duration?: number;
    details?: { label: { en: string; fr: string; ar: string }; amount: number }[];
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
        distanceKm?: number; // Distance from Bricoler to client
        durationMinutes?: number; // Actual trip duration from Bricoler to client
        deliveryDistanceKm?: number; // Distance between pickup and drop-off (Moving/Errands)
        deliveryDurationMinutes?: number; // Duration between pickup and drop-off (Moving/Errands)
        // TV Mounting specific
        tvCount?: number;
        mountTypes?: string[];
        wallMaterial?: string;
        liftingHelp?: string;
        mountingAddOns?: string[];
        taskSize?: 'small' | 'medium' | 'large';
        // Office Cleaning specific
        officeDesks?: number;
        officeMeetingRooms?: number;
        officeBathrooms?: number;
        hasKitchenette?: boolean;
        hasReception?: boolean;
        officeAddOns?: string[];
    } = {}
) => {
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
    let details: { label: { en: string; fr: string; ar: string }; amount: number }[] = [];

    // General Add-ons Check (Applies to all)
    if (options.mountingAddOns?.includes('supplies')) {
        extraFees += 15;
    }

    // Specialized Pricing Flows
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

    } else if (subServiceId === 'local_move' || subServiceId === 'moving' || subServiceId === 'packing' || subServiceId === 'furniture_move' || subServiceId.includes('moving') || subServiceId === 'errands' || subServiceId.includes('delivery') || subServiceId.includes('shopping') || subServiceId.includes('pickup')) {
        // Specialized Moving & Delivery Pricing
        const isErrands = subServiceId === 'errands' || subServiceId.includes('delivery') || subServiceId.includes('shopping') || subServiceId.includes('pickup') || subServiceId.includes('pharmacy');
        const hours = options.hours || 1;
        
        // Travel cost between points (10 MAD per minute)
        const deliveryTravelCost = (options.deliveryDurationMinutes || 0) * 10;
        
        // Distance overage (5 MAD per km beyond 10km)
        let distanceOverage = 0;
        if (options.deliveryDistanceKm && options.deliveryDistanceKm > 10) {
            distanceOverage = Math.round((options.deliveryDistanceKm - 10) * 5);
        }
        
        if (isErrands) {
            // New Errands Pricing: 11 MAD Base + Size Fee + Distance
            basePrice = 11;
            const sizeFees = { small: 0, medium: 9, large: 19 };
            const sizeFee = sizeFees[options.taskSize || 'small'];
            const distanceFee = (options.deliveryDistanceKm || 0) * 2.5; // 2.5 MAD per Km
            
            quantity = options.hours || 1;
            unit = 'errand';
            extraFees = sizeFee + distanceFee;
        } else {
            extraFees = deliveryTravelCost + distanceOverage;
            quantity = hours;
            unit = 'hr';
        }
    } else if (subServiceId === 'office_cleaning') {
        // Office Cleaning Specialized Pricing: Base + Supplements
        basePrice = providerRate;
        quantity = 1;
        unit = 'office';
        
        // Desk fee (19 MAD each)
        const deskCount = options.officeDesks || 1;
        const deskFee = deskCount * 19;
        details.push({ label: { en: `Bureaus (${deskCount})`, fr: `Bureaux (${deskCount})`, ar: `المكاتب (${deskCount})` }, amount: deskFee });
        
        // Meeting Room fee (20 MAD each)
        if (options.officeMeetingRooms && options.officeMeetingRooms > 0) {
            const roomFee = options.officeMeetingRooms * 20;
            details.push({ label: { en: `Meeting Rooms (${options.officeMeetingRooms})`, fr: `Salles de réunion (${options.officeMeetingRooms})`, ar: `غرف الاجتماعات (${options.officeMeetingRooms})` }, amount: roomFee });
        }
        
        // Bathroom fee (20 MAD each)
        if (options.officeBathrooms && options.officeBathrooms > 0) {
            const bathFee = options.officeBathrooms * 20;
            details.push({ label: { en: `Bathrooms (${options.officeBathrooms})`, fr: `Salles de bain (${options.officeBathrooms})`, ar: `الحمامات (${options.officeBathrooms})` }, amount: bathFee });
        }
        
        // Extra Cleaning (20 MAD per selected add-on)
        if (options.officeAddOns && options.officeAddOns.length > 0) {
            const addonFee = options.officeAddOns.length * 20;
            details.push({ label: { en: 'Extra Cleaning Add-ons', fr: 'Extras nettoyage', ar: 'إضافات تنظيف' }, amount: addonFee });
        }
        
        // Include Kitchenette/Reception if not in add-ons but selected
        if (options.hasKitchenette) {
            details.push({ label: { en: 'Kitchenette', fr: 'Kitchenette', ar: 'مطبخ صغير' }, amount: 20 });
        }
        if (options.hasReception) {
            details.push({ label: { en: 'Reception Area', fr: 'Zone de réception', ar: 'منطقة الاستقبال' }, amount: 20 });
        }

        extraFees = details.reduce((sum: number, item) => sum + item.amount, 0);
    } else {
        // Standard Archetype Logic
        switch (archetype) {
            case 'unit':
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

    const subtotal = Math.round(((basePrice * quantity) + extraFees) * 10) / 10;
    const serviceFee = Math.round((subtotal * 0.10) * 10) / 10; // 10% Platform fee
    
    // Unified Travel Fee logic
    const isMovingOrErrands = subServiceId === 'local_move' || subServiceId === 'moving' || subServiceId.includes('moving') || subServiceId === 'errands' || subServiceId.includes('delivery');
    const travelFee = (isMovingOrErrands && extraFees > 0) ? 0 : Math.round((options.distanceKm || 0) * 3 * 10) / 10;
    
    const total = Math.round((subtotal + serviceFee + travelFee) * 100) / 100;

    return {
        basePrice: Math.round(basePrice * 10) / 10,
        quantity,
        unit,
        subtotal,
        serviceFee,
        travelFee,
        total,
        details: details.length > 0 ? details : undefined,
        distanceKm: options.deliveryDistanceKm || options.distanceKm,
        duration: options.deliveryDurationMinutes || options.durationMinutes || Math.ceil((options.distanceKm || 0) * 2)
    };
};
