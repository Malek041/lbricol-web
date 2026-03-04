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
        "Rawnak", "Skala", "The Bay"
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
    cleaning: { tier: 'low', suggestedMin: 60, suggestedMax: 110 },
    errands: { tier: 'low', suggestedMin: 15, suggestedMax: 50 },
    babysitting: { tier: 'low', suggestedMin: 60, suggestedMax: 105 },
    gardening: { tier: 'low', suggestedMin: 65, suggestedMax: 110 },
    furniture_assembly: { tier: 'medium', suggestedMin: 110, suggestedMax: 185 },
    handyman: { tier: 'medium', suggestedMin: 110, suggestedMax: 185 },
    moving: { tier: 'medium', suggestedMin: 110, suggestedMax: 210 },
    mounting: { tier: 'medium', suggestedMin: 110, suggestedMax: 185 },
    painting: { tier: 'medium', suggestedMin: 110, suggestedMax: 225 },
    elderly_care: { tier: 'medium', suggestedMin: 90, suggestedMax: 150 },
    appliance_installation: { tier: 'high', suggestedMin: 185, suggestedMax: 300 },
    plumbing: { tier: 'high', suggestedMin: 185, suggestedMax: 335 },
    electricity: { tier: 'high', suggestedMin: 185, suggestedMax: 375 },
    driver: { tier: 'medium', suggestedMin: 90, suggestedMax: 185 },
    car_rental: { tier: 'medium', suggestedMin: 150, suggestedMax: 375 },
    courier: { tier: 'low', suggestedMin: 60, suggestedMax: 110 },
    airport: { tier: 'medium', suggestedMin: 110, suggestedMax: 225 },
    transport_intercity: { tier: 'medium', suggestedMin: 150, suggestedMax: 375 },
    cooking: { tier: 'high', suggestedMin: 150, suggestedMax: 300 },
    private_driver: { tier: 'medium', suggestedMin: 110, suggestedMax: 260 },
    learn_arabic: { tier: 'high', suggestedMin: 110, suggestedMax: 225 },
};
