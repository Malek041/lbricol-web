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
    subServiceId: string = '',
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
        // Glass Cleaning specific
        windowCount?: number;
        windowSize?: 'small' | 'medium' | 'large';
        buildingStories?: number;
        glassCleaningType?: 'interior' | 'exterior' | 'both';
        glassAccessibility?: 'easy' | 'ladder';
        storeFrontSize?: 'small' | 'medium' | 'large';
        // Gardening specific
        gardenSize?: 'small' | 'medium' | 'large' | 'estate';
        lawnCondition?: 'standard' | 'wild' | 'overgrown';
        needsMower?: boolean;
        // Hospitality & Unit enhancements
        unitCount?: number;
        stairsType?: 'small' | 'medium' | 'large' | 'none';
        tipAmount?: number;
    } = {}
): PricingBreakdown => {
    // 1. Find the subservice to get its archetype
    let archetype: string = 'hourly'; // Default
    let subSvc: SubService | undefined;

    for (const [catId, cat] of Object.entries(SERVICES_HIERARCHY)) {
        subSvc = cat.subServices.find(ss => ss.id === subServiceId);
        if (subSvc) {
            archetype = subSvc.pricingArchetype || 'hourly';
            break;
        }
        if (catId === subServiceId) {
            archetype = cat.subServices[0]?.pricingArchetype || 'hourly';
            break;
        }
    }

    let basePrice = providerRate;
    let quantity = 1;
    let unit = 'job';
    let extraFees = 0;
    let details: { label: { en: string; fr: string; ar: string }; amount: number }[] = [];

    const isSpecialCleaning = ['standard_small', 'standard_large', 'family_home', 'deep_cleaning', 'hospitality_turnover', 'hospitality', 'cleaning'].includes(subServiceId);
    const isMovingOrErrands = subServiceId === 'local_move' || subServiceId === 'moving' || subServiceId === 'packing' || subServiceId === 'furniture_move' || subServiceId.includes('moving') || subServiceId === 'errands' || subServiceId.includes('delivery') || subServiceId.includes('shopping') || subServiceId.includes('pickup');

    // --- New Smart ELC (Estimated Labor & Complexity) Calculation ---
    if (isSpecialCleaning && subSvc) {
        // 1. Base Setup (Prep, travel, unloading)
        const baseSetup = subSvc.baseSetupHr || 0.5;
        
        // 2. Marginal Time per Room/Unit
        // If it's a "standard_small", one room might take 0.75h more.
        // If it's "deep_cleaning", one room might take 1.5h more.
        const marginalTimePerUnit = (subSvc.estimatedDurationHr || 2) / 3; // Approx 1/3 of total Est for a 3-room base
        
        // 3. Property Context Multiplier (The "Vibe" factor)
        const contextMap: Record<string, number> = {
            studio: 0.85,
            apartment: 1.0,
            villa: 1.4,
            guesthouse: 1.5,
            riad: 1.9, // Riads have high complexity (tiles, ornaments, height)
            hotel: 1.6
        };
        const contextMultiplier = contextMap[(options.propertyType || 'Apartment').toLowerCase()] || 1.0;
        
        // 4. Complexity Multiplier (Standard vs Deep vs Hospitality)
        const complexityMultiplier = subSvc.complexityMultiplier || 1.0;
        
        // 5. Volume Decay (Efficiency for larger jobs)
        const rooms = options.rooms || 1;
        // Non-linear scaling: the 1st room is full price, 
        // subsequent rooms are 10% faster/cheaper due to shared overhead.
        const effectiveQuantity = 1 + (Math.max(0, rooms - 1) * 0.9);
        
        // 6. Total Estimated Effort (in Hours)
        const totalEstimatedEffort = (baseSetup + (effectiveQuantity * marginalTimePerUnit)) * complexityMultiplier * contextMultiplier;
        
        // 7. Map back to Output
        let rateMultiplier = 1.0;
        if (subServiceId === 'standard_small' || subServiceId === 'standard_large' || subServiceId === 'family_home') {
            rateMultiplier = 1.5; // Adjusted to match standard market
        } else if (subServiceId === 'deep_cleaning') {
            rateMultiplier = 2.5;
        }

        basePrice = providerRate; 
        quantity = Math.round(totalEstimatedEffort * rateMultiplier * 10) / 10;
        unit = 'hr-equivalent';
        
    } else if (isSpecialCleaning && !subSvc) {
        // Fallback for missing subSvc metadata (using old logic but simplified)
        const multiplier = subServiceId === 'deep_cleaning' ? 2.5 : 1.5;
        basePrice = providerRate;
        const rooms = options.rooms || 1;
        quantity = (1 + (rooms * 0.2)) * multiplier;
        unit = 'job';
    } else if (subServiceId === 'tv_mounting' && subSvc) {
        // 1. Base Setup (Preparation of tools, laser leveling)
        const baseSetup = subSvc.baseSetupHr || 0.6;
        
        // 2. Technical Complexity (Base for mounting a TV)
        const complexityMultiplier = subSvc.complexityMultiplier || 1.5;
        
        // 3. Technical Factors
        let mountMultiplier = 1.0;
        if (options.mountTypes?.some(t => t.toLowerCase().includes('articulating'))) mountMultiplier = 1.35;
        else if (options.mountTypes?.some(t => t.toLowerCase().includes('tilting'))) mountMultiplier = 1.15;
        
        // Wall Material Difficulty
        let wallMultiplier = 1.0;
        const wall = (options. wallMaterial || '').toLowerCase();
        if (wall.includes('brick') || wall.includes('concrete') || wall.includes('stone')) wallMultiplier = 1.3;
        else if (wall.includes('metal')) wallMultiplier = 1.5;
        else if (wall.includes('wood')) wallMultiplier = 1.1;

        // 4. Effort Calculation
        const tvCount = options.tvCount || 1;
        // Non-linear scaling for multiple TVs (setup is done once)
        const effectiveQuantity = 1 + (Math.max(0, tvCount - 1) * 0.85);
        
        const totalEstimatedEffort = (baseSetup + (effectiveQuantity * 0.9)) * complexityMultiplier * mountMultiplier * wallMultiplier;

        // 5. Output
        basePrice = providerRate;
        quantity = Math.round(totalEstimatedEffort * 10) / 10;
        unit = 'hr-equivalent';

        // 6. Extra Fees (Cables, hardware)
        if (options.liftingHelp === 'no_60') extraFees += 50;
        if (options.mountingAddOns?.includes('wires')) extraFees += 40;
        if (options.mountingAddOns?.includes('audio')) extraFees += 15;
        if (options.mountingAddOns?.includes('setup')) extraFees += 20;

    } else if (subServiceId === 'tv_mounting' && !subSvc) {
        // Fallback for missing subSvc
        basePrice = providerRate;
        quantity = (options.tvCount || 1) * 1.5;
        unit = 'TV';
    } else if (isMovingOrErrands) {
        const isErrands = subServiceId === 'errands' || subServiceId.includes('delivery') || subServiceId.includes('shopping') || subServiceId.includes('pickup') || subServiceId.includes('pharmacy');
        const hours = options.hours || 1;
        const deliveryTravelCost = (options.deliveryDurationMinutes || 0) * 10;

        let distanceOverage = 0;
        if (options.deliveryDistanceKm && options.deliveryDistanceKm > 10) {
            distanceOverage = Math.round((options.deliveryDistanceKm - 10) * 5);
        }

        if (isErrands) {
            basePrice = 11;
            const sizeFees = { small: 0, medium: 9, large: 19 };
            const sizeFee = sizeFees[options.taskSize || 'small'];
            const distanceFee = (options.deliveryDistanceKm || 0) * 2.5;

            quantity = options.hours || 1;
            unit = 'errand';
            extraFees = sizeFee + distanceFee;
        } else {
            extraFees = deliveryTravelCost + distanceOverage;
            quantity = hours;
            unit = 'hr';
        }
    } else if (subServiceId === 'office_cleaning') {
        basePrice = providerRate;
        quantity = 1;
        unit = 'office';

        // Office cleaning logic: Base price covers 1 office/desk. 
        // Additional desks are extra.
        const deskCount = options.officeDesks || 1;
        if (deskCount > 1) {
            const extraDesks = deskCount - 1;
            const deskFee = extraDesks * 20;
            details.push({ 
                label: { 
                    en: `Extra Desks (${extraDesks})`, 
                    fr: `Bureaux supplémentaires (${extraDesks})`, 
                    ar: `مكاتب إضافية (${extraDesks})` 
                }, 
                amount: deskFee 
            });
        }

        if (options.officeMeetingRooms && options.officeMeetingRooms > 0) {
            const roomFee = options.officeMeetingRooms * 25;
            details.push({ 
                label: { 
                    en: `Meeting Rooms (${options.officeMeetingRooms})`, 
                    fr: `Salles de réunion (${options.officeMeetingRooms})`, 
                    ar: `غرف الاجتماعات (${options.officeMeetingRooms})` 
                }, 
                amount: roomFee 
            });
        }

        if (options.officeBathrooms && options.officeBathrooms > 0) {
            const bathFee = options.officeBathrooms * 20;
            details.push({ 
                label: { 
                    en: `Bathrooms (${options.officeBathrooms})`, 
                    fr: `Salles de bain (${options.officeBathrooms})`, 
                    ar: `الحمامات (${options.officeBathrooms})` 
                }, 
                amount: bathFee 
            });
        }

        if (options.hasKitchenette) {
            details.push({ 
                label: { en: 'Kitchenette', fr: 'Kitchenette', ar: 'مطبخ صغير' }, 
                amount: 25 
            });
        }
        
        if (options.hasReception) {
            details.push({ 
                label: { en: 'Reception Area', fr: 'Zone de réception', ar: 'منطقة الاستقبال' }, 
                amount: 30 
            });
        }

        if (options.officeAddOns && options.officeAddOns.length > 0) {
            const addonFee = options.officeAddOns.length * 20;
            details.push({ 
                label: { en: 'Extras', fr: 'Extras', ar: 'إضافات' }, 
                amount: addonFee 
            });
        }

        extraFees = details.reduce((sum: number, item) => sum + item.amount, 0);
    } else if (subServiceId === 'residential_glass' || subServiceId === 'commercial_glass') {
        const winCount = options.windowCount || 10;
        const stories = options.buildingStories || 1;
        const isBoth = options.glassCleaningType === 'both';
        
        // 1. Complexity Base
        let complexityPart = 15 * winCount;
        
        // 2. Both Surfaces Surcharge (+40%)
        if (isBoth) {
            complexityPart *= 1.4;
        }
        
        // 3. Story Multiplier (Applies to everything: Labor + Complexity)
        // Set quantity to 1 to keep Labor as a job-based fee, but multiply the rate
        quantity = 1; 
        unit = 'job';
        
        const totalLabor = providerRate * stories;
        const totalComplexity = complexityPart * stories;
        // We add both Complexity AND Labor Adjustment to extraFees so subtotal is correct
        extraFees += (totalLabor - providerRate * quantity) + totalComplexity;
        
        details.push({
            label: { 
                en: `Base Labor (Rate: ${providerRate} MAD)`, 
                fr: `Main d'œuvre (Base: ${providerRate} MAD)`,
                ar: `أجر العمل الأساسي (${providerRate} درهم)`
            },
            amount: totalLabor
        });

        details.push({
            label: { 
                en: `Windows (${winCount})${isBoth ? ' - Both Sides' : ''}${stories > 1 ? ` x ${stories} Floors` : ''}`, 
                fr: `Fenêtres (${winCount})${isBoth ? ' - Les deux' : ''}${stories > 1 ? ` x ${stories} Étages` : ''}`, 
                ar: `النوافذ (${winCount})${isBoth ? ' - كلا الجانبين' : ''}${stories > 1 ? ` x ${stories} طوابق` : ''}` 
            },
            amount: Math.round(totalComplexity * 10) / 10
        });

        if (options.glassAccessibility === 'ladder') {
            const ladderFee = (subServiceId === 'commercial_glass' ? 60 : 40) * stories;
            extraFees += ladderFee;
            details.push({ 
                label: { en: 'Height Access Fee', fr: 'Supplément hauteur', ar: 'رسوم العمل في الارتفاع' }, 
                amount: ladderFee 
            });
        }
    } else if (subServiceId === 'lawn_mowing') {
        const sizeMultipliers: Record<string, number> = { small: 1.0, medium: 2.0, large: 3.5, estate: 6.0 };
        const conditionMultipliers: Record<string, number> = { standard: 1.0, wild: 1.5, overgrown: 2.0 };
        
        const sizeMult = sizeMultipliers[options.gardenSize || 'small'];
        const condMult = conditionMultipliers[options.lawnCondition || 'standard'];
        const mowerFee = options.needsMower ? 50 : 0;

        quantity = 1; 
        unit = 'job';
        
        const sizeMinima: Record<string, number> = { small: 120, medium: 180, large: 300, estate: 500 };
        const baseMin = sizeMinima[options.gardenSize || 'small'];
        const baseLaborForSize = Math.max(baseMin, providerRate * sizeMult);
        
        // The condition multipliers (Wild/Overgrown) are felt on top of the size-specific minimum.
        const totalLabor = baseLaborForSize * condMult;

        // Correcting the labor subtotal logic
        extraFees = mowerFee + (totalLabor - providerRate * quantity);
        
        details.push({
            label: { 
                en: `Lawn Mowing (${options.gardenSize || 'small'})${providerRate * sizeMult < baseMin ? ' (Min. Base)' : ''}`, 
                fr: `Tonte de pelouse (${options.gardenSize || 'small'})${providerRate * sizeMult < baseMin ? ' (Base Min.)' : ''}`, 
                ar: `قص العشب (${options.gardenSize || 'small'})` 
            },
            amount: Math.round(totalLabor * 10) / 10
        });
        
        if (options.needsMower) {
            details.push({
                label: { en: 'Equipment Rental', fr: 'Matériel (Tondeuse)', ar: 'تأجير المعدات (جزازة)' },
                amount: mowerFee
            });
        }
    } else {
        // Fallback Strategy
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
            default:
                quantity = 1;
                unit = 'fixed';
                break;
        }

        if (options.propertyType) {
            const coefMap: Record<string, number> = { studio: 0.9, apartment: 1.0, villa: 1.2, guesthouse: 1.3, riad: 1.4, hotel: 1.5 };
            const coefficient = coefMap[options.propertyType.toLowerCase()];
            if (coefficient && coefficient !== 1.0) {
                const adjustment = (providerRate * quantity * coefficient) - (providerRate * quantity);
                extraFees += adjustment;
                details.push({
                    label: { en: 'Property Complexity', fr: 'Complexité du lieu', ar: 'تعقيد المكان' },
                    amount: Math.round(adjustment * 10) / 10
                });
            }
        }
    }

    // --- Add-ons & Multipliers ---
    
    // 1. Unit Multiplier (for Hospitality/Apartments)
    const unitCount = options.unitCount || 1;
    if (unitCount > 1) {
        // We multiply the logic above by the number of units/apartments
        extraFees += (basePrice * quantity) * (unitCount - 1);
        details.push({
            label: { 
                en: `Multiplier for ${unitCount} Units`, 
                fr: `Multiplicateur pour ${unitCount} Biens`, 
                ar: `مضاعف لـ ${unitCount} وحدات` 
            },
            amount: Math.round(((basePrice * quantity) * (unitCount - 1)) * 10) / 10
        });
    }

    // 2. Stairs Surcharge
    if (options.stairsType && options.stairsType !== 'none') {
        const stairFees = { small: 30, medium: 45, large: 60, none: 0 };
        const stairFee = stairFees[options.stairsType] || 0;
        extraFees += stairFee;
        details.push({
            label: { en: 'Stairs Cleaning', fr: 'Nettoyage des escaliers', ar: 'تنظيف السلالم' },
            amount: stairFee
        });
    }

    // --- Calculations ---
    const subtotal = Math.round(((providerRate * quantity) + extraFees) * 10) / 10;
    const serviceFee = Math.round((subtotal * 0.10) * 10) / 10;
    const travelFee = Math.round((Number(options.distanceKm) || 0) * 1 * 10) / 10;
    
    // 3. Tips (Added after fees)
    const tip = options.tipAmount || 0;
    const total = Math.round((subtotal + serviceFee + travelFee + tip) * 100) / 100;

    if (tip > 0) {
        details.push({
            label: { en: 'Tip for Bricoler', fr: 'Pourboire bricoleur', ar: 'عمولة إضافية' },
            amount: tip
        });
    }

    return {
        basePrice: providerRate, // Always that of Bricoler
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
