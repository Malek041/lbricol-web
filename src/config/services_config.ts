import {
    Hammer,
    Package,
    Trash2,
    Droplets,
    Lightbulb,
    PenTool,
    Truck,
    Wrench,
    Monitor,
    PackageCheck,
    Leaf,
    Baby,
    HeartPulse,
    HeartHandshake,
    Car,
    Key,
    Plane,
    Map as MapIcon,
    Dog,
    Waves,
    Utensils,
    Languages,
    BookOpen,
    type LucideIcon
} from 'lucide-react';

export interface SubService {
    id: string;
    name: string;
    desc?: { en: string; fr: string; ar: string };
}

export interface ServiceConfig {
    id: string;
    name: string;
    icon: LucideIcon;
    subServices: SubService[];
}

export const SERVICES_HIERARCHY: Record<string, ServiceConfig> = {
    // Phase 1: Core "Binary Success" Categories
    furniture_assembly: {
        id: 'furniture_assembly',
        name: 'Furniture assembly',
        icon: Package,
        subServices: [
            {
                id: 'general_assembly',
                name: 'General Furniture Assembly',
                desc: {
                    en: 'Assemble all types of furniture including dressers, beds, and tables.',
                    fr: 'Assemblez tous types de meubles, y compris les commodes, les lits et les tables.',
                    ar: 'تجميع جميع أنواع الأثاث بما في ذلك الخزائن والأسرة والطاولات.'
                }
            },
            {
                id: 'ikea_flatpack',
                name: 'IKEA / Flat-Pack Assembly',
                desc: {
                    en: 'Specialized assembly for flat-pack furniture like IKEA products.',
                    fr: 'Assemblage spécialisé pour les meubles en kit comme les produits IKEA.',
                    ar: 'تجميع متخصص للأثاث المعبأ بشكل مسطح مثل منتجات ايكيا.'
                }
            },
            { id: 'crib_assembly', name: 'Crib Assembly' },
            { id: 'bookshelf_assembly', name: 'Bookshelf Assembly' },
            { id: 'desk_assembly', name: 'Desk Assembly' }
        ]
    },
    moving: {
        id: 'moving',
        name: 'Moving help',
        icon: Truck,
        subServices: [
            {
                id: 'local_move',
                name: 'Local Moving',
                desc: {
                    en: 'Help with moving boxes and furniture within the same city.',
                    fr: 'Aide au déménagement de cartons et de meubles dans la même ville.',
                    ar: 'المساعدة في نقل الصناديق والأثاث داخل نفس المدينة.'
                }
            },
            { id: 'packing', name: 'Packing Services' },
            { id: 'furniture_move', name: 'Furniture Moving Only' }
        ]
    },
    handyman: {
        id: 'handyman',
        name: 'Handyman',
        icon: Hammer,
        subServices: [
            {
                id: 'general_repairs',
                name: 'General Repairs',
                desc: {
                    en: 'Small fixes around the house like fixing a leaky roof or a squeaky door.',
                    fr: 'Petites réparations dans la maison comme réparer un toit qui fuit ou une porte qui grince.',
                    ar: 'إصلاحات صغيرة في جميع أنحاء المنزل مثل إصلاح سقف يسرب أو باب يصدر صريراً.'
                }
            },
            { id: 'door_lock', name: 'Door & Lock Repair' },
            { id: 'furniture_fix', name: 'Furniture Fixes' },
            { id: 'shelf_mounting', name: 'Shelf Mounting' },
            { id: 'caulking', name: 'Caulking & Grouting' }
        ]
    },
    mounting: {
        id: 'mounting',
        name: 'Mounting',
        icon: Monitor,
        subServices: [
            {
                id: 'tv_mount',
                name: 'TV Mounting',
                desc: {
                    en: 'Securely mount TVs of all sizes onto any type of wall.',
                    fr: 'Fixez solidement des téléviseurs de toutes tailles sur tout type de mur.',
                    ar: 'تثبيت أجهزة التلفزيون من جميع الأحجام بأمان على أي نوع من الجدران.'
                }
            },
            { id: 'shelf_mount', name: 'Shelf Installation' },
            { id: 'curtain_mount', name: 'Curtain Rod Installation' },
            { id: 'mirror_hanging', name: 'Mirror Hanging' },
            { id: 'picture_hanging', name: 'Picture Hanging' }
        ]
    },

    // Phase 2: Home Infrastructure & Restoration
    plumbing: {
        id: 'plumbing',
        name: 'Plumbing',
        icon: Droplets,
        subServices: [
            {
                id: 'leak_repair',
                name: 'Leak Repair',
                desc: {
                    en: 'Identify and fix leaks in pipes, faucets, and toilets to prevent water damage.',
                    fr: 'Identifiez et réparez les fuites dans les tuyaux, les robinets et les toilettes pour éviter les dégâts des eaux.',
                    ar: 'تحديد وإصلاح التسريبات في الأنابيب والحنفيات والمراحيض لمنع أضرار المياه.'
                }
            },
            { id: 'pipe_install', name: 'Pipe Installation' },
            { id: 'drain_clean', name: 'Drain Cleaning' },
            { id: 'faucet_repair', name: 'Faucet Repair' },
            { id: 'toilet_repair', name: 'Toilet Repair' }
        ]
    },
    electricity: {
        id: 'electricity',
        name: 'Electricity',
        icon: Lightbulb,
        subServices: [
            {
                id: 'wiring',
                name: 'Wiring & Rewiring',
                desc: {
                    en: 'Safe installation or replacement of electrical wiring in residential buildings.',
                    fr: 'Installation ou remplacement sécurisé du câblage électrique dans les bâtiments résidentiels.',
                    ar: 'التركيب الآمن أو استبدال الأسلاك الكهربائية في المباني السكنية.'
                }
            },
            { id: 'outlet_install', name: 'Outlet Installation' },
            { id: 'light_install', name: 'Light Fixture Installation' },
            { id: 'circuit_repair', name: 'Circuit Breaker Repair' },
            { id: 'cooling_heating', name: 'Heating/cooling systems' },
            { id: 'ev_charger', name: 'EVs charger' },
            { id: 'surveillance_cameras', name: 'Camera installation' }
        ]
    },
    painting: {
        id: 'painting',
        name: 'Painting',
        icon: PenTool,
        subServices: [
            {
                id: 'indoor_painting',
                name: 'Indoor Painting',
                desc: {
                    en: 'Professional interior painting for walls, ceilings, and trim.',
                    fr: 'Peinture intérieure professionnelle pour les murs, les plafonds et les boiseries.',
                    ar: 'دهان داخلي احترافي للجدران والأسقف والزخارف.'
                }
            },
            { id: 'wallpapering', name: 'Wallpapering' },
            { id: 'outdoor_painting', name: 'Outdoor Painting' },
            { id: 'concrete_brick_painting', name: 'Concrete & Brick Painting' },
            { id: 'accent_wall_painting', name: 'Accent Wall Painting' },
            { id: 'wallpaper_removal', name: 'Wallpaper Removal' }
        ]
    },
    appliance_installation: {
        id: 'appliance_installation',
        name: 'Home Repairs',
        icon: Wrench,
        subServices: [
            { id: 'door_cabinet_furniture_repair', name: 'Door, Cabinet, & Furniture Repair' },
            { id: 'wall_repair', name: 'Wall Repair' },
            { id: 'sealing_caulking', name: 'Sealing & Caulking' },
            { id: 'appliance_install_repair', name: 'Appliance Installation & Repairs' },
            { id: 'window_blinds_repair', name: 'Window & Blinds Repair' },
            { id: 'flooring_tiling', name: 'Flooring & Tiling Help' },
            { id: 'electrical_help', name: 'Electrical Help' },
            { id: 'plumbing_help', name: 'Plumbing Help' },
            { id: 'light_carpentry', name: 'Light Carpentry' },
            { id: 'window_winterization', name: 'Window Winterization' }
        ]
    },

    // Phase 3: Recurring Maintenance & Errands
    cleaning: {
        id: 'cleaning',
        name: 'Cleaning',
        icon: Trash2,
        subServices: [
            {
                id: 'family_home',
                name: 'Family Home Cleaning',
                desc: {
                    en: 'Standard cleaning services for houses and apartments including dusting, vacuuming, and mopping.',
                    fr: 'Services de nettoyage standard pour maisons et appartements, y compris l\'époussetage, l\'aspirateur et la serpillère.',
                    ar: 'خدمات التنظيف القياسية للمنازل والشقق بما في ذلك نفض الغبار والكنس بالمكنسة الكهربائية والمسح.'
                }
            },
            { id: 'hospitality', name: 'Airbnb Cleaning' },
            { id: 'car_wash', name: 'Car Washing' },
            { id: 'car_detail', name: 'Car Detailing' },
            { id: 'deep_clean', name: 'Deep Home Cleaning' }
        ]
    },
    errands: {
        id: 'errands',
        name: 'Errands',
        icon: PackageCheck,
        subServices: [
            { id: 'grocery_shopping', name: 'Grocery Shopping' },
            { id: 'pharmacy_pickup', name: 'Pharmacy Pickup' },
            { id: 'general_delivery', name: 'General Pickup & Drop-off' },
            { id: 'post_office', name: 'Post Office / Mailing' },
            { id: 'returns', name: 'In-store Returns' }
        ]
    },
    glass_cleaning: {
        id: 'glass_cleaning',
        name: 'Glass cleaning',
        icon: Droplets,
        subServices: [
            { id: 'residential_glass', name: 'Residential Glass' },
            { id: 'commercial_glass', name: 'Commercial/Office Glass' },
            { id: 'automotive_glass', name: 'Automotive Glass' },
            { id: 'specialty_glass', name: 'Specialty/Hard-to-Clean Glass' },
            { id: 'alternative_surfaces', name: 'Alternative Surfaces (Mirrors, Stainless Steel)' }
        ]
    },
    gardening: {
        id: 'gardening',
        name: 'Gardening',
        icon: Leaf,
        subServices: [
            { id: 'lawn_mowing', name: 'Lawn Mowing' },
            { id: 'tree_trimming', name: 'Tree Trimming' },
            { id: 'planting', name: 'Planting & Landscaping' }
        ]
    },

    // Phase 4: High-Trust & Niche Services
    babysitting: {
        id: 'babysitting',
        name: 'Babysitting',
        icon: Baby,
        subServices: [
            {
                id: 'regular_babysitting',
                name: 'Regular Babysitting',
                desc: {
                    en: 'Day-to-day childcare services including playing, feeding, and basic care.',
                    fr: 'Services de garde d\'enfants au quotidien, y compris les jeux, les repas et les soins de base.',
                    ar: 'خدمات رعاية الأطفال اليومية بما في ذلك اللعب والتغذية والرعاية الأساسية.'
                }
            },
            { id: 'after_school_care', name: 'After-School Care' },
            { id: 'night_sitting', name: 'Night Sitting' },
            { id: 'day_out_supervision', name: 'Day Out Supervision' }
        ]
    },
    pool_cleaning: {
        id: 'pool_cleaning',
        name: 'Pool cleaning',
        icon: Waves,
        subServices: [
            { id: 'chemical_balancing', name: 'Chemical Balancing' },
            { id: 'skimming_vacuuming', name: 'Skimming & Vacuuming' },
            { id: 'filter_cleaning', name: 'Filter Cleaning' },
            { id: 'seasonal_opening', name: 'Opening / Closing' },
            { id: 'tile_brushing', name: 'Tile & Wall Brushing' }
        ]
    },
    pets_care: {
        id: 'pets_care',
        name: 'Pets care',
        icon: Dog,
        subServices: [
            { id: 'dog_walking', name: 'Dog Walking' },
            { id: 'pet_sitting', name: 'Pet Sitting' },
            { id: 'pet_grooming', name: 'Pet Grooming' },
            { id: 'pet_feeding', name: 'Feeding & Check-ins' },
            { id: 'pet_transport', name: 'Pet Transportation' }
        ]
    },

    elderly_care: {
        id: 'elderly_care',
        name: 'Elderly care',
        icon: HeartHandshake,
        subServices: [
            { id: 'companionship', name: 'Companionship & Visits' },
            { id: 'personal_assistance', name: 'Personal Assistance' },
            { id: 'medication_reminders', name: 'Medication Reminders' },
            { id: 'meal_preparation', name: 'Meal Preparation' },
            { id: 'light_housekeeping', name: 'Light Housekeeping' },
            { id: 'transportation_errands', name: 'Transportation & Errands' }
        ]
    },

    // Go Services
    driver: {
        id: 'driver',
        name: 'Car with driver',
        icon: Car,
        subServices: [
            { id: 'hourly', name: 'Hourly Service' },
            { id: 'daily', name: 'Daily Service' },
            { id: 'event', name: 'Event Transportation' }
        ]
    },
    car_rental: {
        id: 'car_rental',
        name: 'Car rental',
        icon: Key,
        subServices: []
    },
    courier: {
        id: 'courier',
        name: 'Courier / delivery',
        icon: PackageCheck,
        subServices: []
    },
    airport: {
        id: 'airport',
        name: 'Airport pickup',
        icon: Plane,
        subServices: []
    },
    transport_intercity: {
        id: 'transport_intercity',
        name: 'Intercity transport',
        icon: MapIcon,
        subServices: []
    },
    cooking: {
        id: 'cooking',
        name: 'Cooking',
        icon: Utensils,
        subServices: [
            { id: 'breakfast', name: 'Breakfast' },
            { id: 'lunch', name: 'Lunch' },
            { id: 'dinner', name: 'Dinner' },
            { id: 'moroccan_cooking', name: 'Moroccan Cooking Class' },
            { id: 'private_chef', name: 'Private Chef at Home' },
            { id: 'pastry_class', name: 'Moroccan Pastry Workshop' },
            { id: 'market_tour_cooking', name: 'Market Tour & Cooking' }
        ]
    },
    private_driver: {
        id: 'private_driver',
        name: 'Private Driver',
        icon: Car,
        subServices: [
            { id: 'city_half_day', name: 'Half-Day City Driver' },
            { id: 'city_full_day', name: 'Full-Day City Driver' },
            { id: 'airport_vip', name: 'VIP Airport Transfer' },
            { id: 'intercity_driver', name: 'Intercity Trip Driver' }
        ]
    },
    learn_arabic: {
        id: 'learn_arabic',
        name: 'Learn Arabic',
        icon: Languages,
        subServices: [
            { id: 'darija_intro', name: 'Intro to Moroccan Darija' },
            { id: 'conversational_arabic', name: 'Conversational Practice' },
            { id: 'arabic_calligraphy', name: 'Arabic Calligraphy Intro' },
            { id: 'survival_arabic', name: 'Survival Arabic for Tourists' }
        ]
    },
    tour_guide: {
        id: 'tour_guide',
        name: 'Tour Guide',
        icon: MapIcon,
        subServices: [
            { id: 'city_tour', name: 'City Tour' },
            { id: 'historical_tour', name: 'Historical Sites Tour' },
            { id: 'food_tour', name: 'Moroccan Food Tour' },
            { id: 'medina_shopping', name: 'Medina Shopping Guide' }
        ]
    }
};

// Helper function to get all services as an array
export const getAllServices = (): ServiceConfig[] => {
    return Object.values(SERVICES_HIERARCHY);
};

// Helper function to get service by ID or Name (case-insensitive)
export const getServiceById = (idOrName: any): ServiceConfig | undefined => {
    if (!idOrName || typeof idOrName !== 'string') return undefined;
    // 1. Direct ID lookup
    if (SERVICES_HIERARCHY[idOrName]) return SERVICES_HIERARCHY[idOrName];

    // 2. Case-insensitive ID lookup
    const lower = idOrName.toLowerCase();
    if (SERVICES_HIERARCHY[lower]) return SERVICES_HIERARCHY[lower];

    // 3. Name lookup (case-insensitive)
    return Object.values(SERVICES_HIERARCHY).find(s =>
        s.name === idOrName || (s.name && s.name.toLowerCase() === lower)
    );
};

// Helper function to get the standardized service name
export const getServiceName = (idOrName: string): string => {
    const service = getServiceById(idOrName);
    return service?.name || idOrName;
};

// Helper function to get sub-service name
export const getSubServiceName = (serviceIdOrName: string, subServiceIdOrName: string): string | undefined => {
    const service = getServiceById(serviceIdOrName);
    if (!service) return undefined;
    const subService = service.subServices.find(ss =>
        ss.id === subServiceIdOrName || ss.name === subServiceIdOrName
    );
    return subService?.name;
};

// Helper function to get the correct vector path for a service
export const getServiceVector = (serviceIdOrName: string | undefined): string => {
    if (!serviceIdOrName) return '/Images/Service Category vectors/HandymanVector.webp';
    const id = serviceIdOrName.toLowerCase();

    if (id.includes('handyman') || id.includes('repair')) return '/Images/Service Category vectors/HandymanVector.webp';
    if (id.includes('assembly')) return '/Images/Service Category vectors/AsssemblyVector.webp';
    if (id.includes('mounting')) return '/Images/Service Category vectors/MountingVector.webp';
    if (id.includes('moving')) return '/Images/Service Category vectors/MovingHelpVector.webp';
    if (id.includes('pool')) return '/Images/Vectors Illu/Poolcleaning_VI.webp';
    if (id.includes('pet')) return '/Images/Vectors Illu/petscare.webp';
    if (id.includes('errand')) return '/Images/Vectors Illu/shoppingbag.webp';
    if (id.includes('elderly')) return '/Images/Vectors Illu/ElderlyCare_VI.webp';
    if (id.includes('glass')) return '/Images/Service Category vectors/Glass cleaning.webp';
    if (id.includes('cleaning')) return '/Images/Service Category vectors/CleaningVector.webp';
    if (id.includes('gardening')) return '/Images/Service Category vectors/GardeningVector.webp';
    if (id.includes('plumbing')) return '/Images/Service Category vectors/PlumbingVector.webp';
    if (id.includes('electricity')) return '/Images/Service Category vectors/ElectricityVector.webp';
    if (id.includes('painting')) return '/Images/Service Category vectors/Paintingvector.webp';
    if (id.includes('babysitting')) return '/Images/Vectors Illu/babysetting.webp';
    if (id.includes('appliance')) return '/Images/Service Category vectors/homerepairVector.webp';
    if (id.includes('cooking')) return '/Images/Vectors Illu/cooking.webp';
    if (id.includes('driver')) return '/Images/Vectors Illu/BWCardirever.webp';
    if (id.includes('arabic') || id.includes('learn')) return '/Images/Vectors Illu/Arabic Letter.webp';
    if (id.includes('tour') || id.includes('guide')) return '/Images/Vectors Illu/de099bb06d30cd9d1c5744cc227c189f-Photoroom.webp';

    return '/Images/Service Category vectors/HandymanVector.webp'; // Fallback
};
