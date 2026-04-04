import { calculateOrderPrice } from '../src/lib/pricing';

const runTests = () => {
    console.log("--- STARTING SMART PRICING TESTS ---");

    const providerRate = 80; // MAD per hour average

    // Test 1: Cleaning - Studio vs Villa
    const studioCleaning = calculateOrderPrice('standard_small', providerRate, { 
        rooms: 1, 
        propertyType: 'Studio' 
    });
    const villaCleaning = calculateOrderPrice('standard_small', providerRate, { 
        rooms: 3, 
        propertyType: 'Villa' 
    });
    const riadDeepCleaning = calculateOrderPrice('deep_cleaning', providerRate, {
        rooms: 5,
        propertyType: 'Riad'
    });

    console.log("1. Studio Cleaning (1 Room):", studioCleaning.total, "MAD (Expected: ~110-140)");
    console.log("2. Villa Cleaning (3 Rooms, Standard):", villaCleaning.total, "MAD (Expected: ~300-400)");
    console.log("3. Riad Deep Cleaning (5 Rooms):", riadDeepCleaning.total, "MAD (Expected: ~1000-1500)");

    // Test 2: TV Mounting - Simple vs Complex
    const simpleTV = calculateOrderPrice('tv_mounting', providerRate, { 
        tvCount: 1, 
        wallMaterial: 'Drywall',
        mountTypes: ['Fixed']
    });
    const complexTV = calculateOrderPrice('tv_mounting', providerRate, { 
        tvCount: 2, 
        wallMaterial: 'Concrete',
        mountTypes: ['Articulating']
    });

    console.log("4. Simple TV Mounting (1 TV):", simpleTV.total, "MAD (Expected: ~150-250)");
    console.log("5. Complex TV Mounting (2 TVs, Concrete, Articulating):", complexTV.total, "MAD (Expected: ~600-800)");

    console.log("--- TESTS COMPLETE ---");
};

runTests();
