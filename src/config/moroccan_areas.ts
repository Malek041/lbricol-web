export const MOROCCAN_CITIES_AREAS: Record<string, string[]> = {
    Casablanca: [
        "Ain Chock", "Ain Sebaa", "Anfa", "Bernoussi", "Ben M'Sick", "Derb Sultan",
        "El Fida", "Hay Hassani", "Hay Mohammadi", "Maarif", "Mers Sultan", "Moulay Rachid",
        "Sidi Bernoussi", "Sidi Moumen", "Ain Diab", "Bourgogne", "CIL", "California",
        "Gauthier", "Racine", "Val Fleuri", "Palmier", "Belvédère", "Roches Noires", "Zerktouni"
    ],
    Marrakech: [
        "Guéliz", "Hivernage", "Mellah", "Médina", "Palmeraie", "Riad Zitoun", "Jemaa el-Fna",
        "Bab Doukkala", "Daoudiate", "Massira", "Targa", "M'Hamid", "Sidi Ghanem",
        "Annakhil", "Azli", "Sidi Youssef Ben Ali", "Arset Lmaach"
    ],
    Essaouira: [
        "Al Fath", "Azlef", "Bouhaira", "Bab Doukkala", "Beach of Jrayfat", "Diabat",
        "Douar Laarab", "El Borj 1", "El Borj 2", "Essaouira Fishing Port",
        "Ghazoua (El Ghazoua)", "Iderk", "Kasbah District", "Lagune",
        "Lotissement Al Matar", "Lotissement Laftihat", "Médina",
        "Mellah (Jewish Quarter)", "Quartier As-Salam", "Quartier binlaârassi",
        "Quartier des Dunes", "Quartier Industriel", "Quartier Nouvelle Saqqalah",
        "Rawnak", "Skala", "The Bay",
        "Sidi Magdoul", "Argana", "Lahrarta", "Ida Ougourd", "Road of Ounagha",
        "Kilometre 8", "Kilometre 24", "Ounagha", "Sidi Kaouki", "Ouassane"
    ],
    Agadir: [
        "Hay Mohammadi", "Tikiouine", "Dakhla", "Ait Melloul", "Founty", "Charaf",
        "Hay Salam", "Nouvelle Ville", "Bensergao", "Tilila", "Cité Dakhla", "Secteur 5", "Secteur 7"
    ],
    Tangier: [
        "Médina", "Beni Makada", "Val Fleuri", "Malabata", "Centre Ville",
        "Marshan", "Marchane", "Hay Andalous", "Charf", "Gzenneya"
    ],
    Rabat: [
        "Agdal", "Hassan", "Hay Riad", "Souissi", "Diour Jamaa",
        "Yaacoub El Mansour", "Akkari", "Massira"
    ],
    Fes: [
        "Fès el-Bali", "Fès El-Jdid", "Zouagha", "Bensouda", "Saiss", "Akolay", "Dokkarat", "Sidi Brahim"
    ],
};

export const MOROCCAN_CITIES = Object.keys(MOROCCAN_CITIES_AREAS);

export interface PricingBenchmark {
    tier: 'low' | 'medium' | 'high';
    suggestedMin: number;
    suggestedMax: number;
    unitLabel?: { en: string; fr: string; ar: string };
}

// Pricing guidance per skill tier
export const SERVICE_TIER_RATES: Record<string, PricingBenchmark> = {
    cleaning: { 
        tier: 'low', 
        suggestedMin: 50, 
        suggestedMax: 100,
        unitLabel: { en: 'per room', fr: 'par pièce', ar: 'لكل غرفة' }
    },
    errands: { 
        tier: 'low', 
        suggestedMin: 15, 
        suggestedMax: 50,
        unitLabel: { en: 'per trip', fr: 'par trajet', ar: 'لكل جولة' }
    },
    babysitting: { tier: 'low', suggestedMin: 40, suggestedMax: 80 },
    gardening: { tier: 'low', suggestedMin: 45, suggestedMax: 100 },
    furniture_assembly: { tier: 'medium', suggestedMin: 80, suggestedMax: 140 },
    handyman: { tier: 'medium', suggestedMin: 100, suggestedMax: 200 },
    moving: { tier: 'medium', suggestedMin: 100, suggestedMax: 250 },
    mounting: { 
        tier: 'medium', 
        suggestedMin: 100, 
        suggestedMax: 250,
        unitLabel: { en: 'per item', fr: 'par objet', ar: 'لكل قطعة' }
    },
    painting: { 
        tier: 'medium', 
        suggestedMin: 80, 
        suggestedMax: 200,
        unitLabel: { en: 'per room', fr: 'par pièce', ar: 'لكل غرفة' }
    },
    elderly_care: { tier: 'medium', suggestedMin: 80, suggestedMax: 150 },
    appliance_installation: { tier: 'high', suggestedMin: 150, suggestedMax: 350 },
    plumbing: { tier: 'high', suggestedMin: 150, suggestedMax: 400 },
    electricity: { tier: 'high', suggestedMin: 150, suggestedMax: 450 },
    driver: { tier: 'medium', suggestedMin: 100, suggestedMax: 250 },
    car_rental: { tier: 'medium', suggestedMin: 150, suggestedMax: 450 },
    courier: { tier: 'low', suggestedMin: 40, suggestedMax: 100 },
    airport: { tier: 'medium', suggestedMin: 150, suggestedMax: 350 },
    transport_intercity: { tier: 'medium', suggestedMin: 200, suggestedMax: 800 },
    cooking: { tier: 'high', suggestedMin: 150, suggestedMax: 400 },
    private_driver: { tier: 'medium', suggestedMin: 100, suggestedMax: 300 },
    learn_arabic: { tier: 'high', suggestedMin: 100, suggestedMax: 250 },
    tour_guide: { tier: 'medium', suggestedMin: 100, suggestedMax: 300 },
};
