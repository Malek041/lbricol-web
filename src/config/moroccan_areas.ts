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

// Pricing guidance per skill tier
export const SERVICE_TIER_RATES: Record<string, { tier: 'low' | 'medium' | 'high'; suggestedMin: number; suggestedMax: number }> = {
    cleaning: { tier: 'low', suggestedMin: 40, suggestedMax: 80 },
    errands: { tier: 'low', suggestedMin: 15, suggestedMax: 40 },
    babysitting: { tier: 'low', suggestedMin: 40, suggestedMax: 80 },
    gardening: { tier: 'low', suggestedMin: 45, suggestedMax: 85 },
    furniture_assembly: { tier: 'medium', suggestedMin: 80, suggestedMax: 140 },
    handyman: { tier: 'medium', suggestedMin: 80, suggestedMax: 140 },
    moving: { tier: 'medium', suggestedMin: 80, suggestedMax: 160 },
    mounting: { tier: 'medium', suggestedMin: 80, suggestedMax: 140 },
    painting: { tier: 'medium', suggestedMin: 80, suggestedMax: 180 },
    elderly_care: { tier: 'medium', suggestedMin: 70, suggestedMax: 120 },
    appliance_installation: { tier: 'high', suggestedMin: 140, suggestedMax: 240 },
    plumbing: { tier: 'high', suggestedMin: 140, suggestedMax: 260 },
    electricity: { tier: 'high', suggestedMin: 140, suggestedMax: 300 },
    driver: { tier: 'medium', suggestedMin: 70, suggestedMax: 140 },
    car_rental: { tier: 'medium', suggestedMin: 120, suggestedMax: 280 },
    courier: { tier: 'low', suggestedMin: 40, suggestedMax: 80 },
    airport: { tier: 'medium', suggestedMin: 80, suggestedMax: 180 },
    transport_intercity: { tier: 'medium', suggestedMin: 120, suggestedMax: 300 },
    cooking: { tier: 'high', suggestedMin: 120, suggestedMax: 240 },
    private_driver: { tier: 'medium', suggestedMin: 80, suggestedMax: 200 },
    learn_arabic: { tier: 'high', suggestedMin: 80, suggestedMax: 180 },
    tour_guide: { tier: 'medium', suggestedMin: 80, suggestedMax: 180 },
};
