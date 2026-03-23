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
    pricingArchetype?: 'hourly' | 'fixed' | 'unit' | 'rental';
}

export interface ServiceConfig {
    id: string;
    name: string;
    icon: LucideIcon;
    subServices: SubService[];
}

export const SERVICES_HIERARCHY: Record<string, ServiceConfig> = {
    // 1. Core Services (Immediate / Binary Success)
    furniture_assembly: {
        id: 'furniture_assembly',
        name: 'Furniture assembly',
        icon: Package,
        subServices: [
            {
                id: 'general_assembly',
                name: 'General Furniture Assembly',
                pricingArchetype: 'hourly',
                desc: {
                    en: 'Assemble all types of furniture including dressers, beds, and tables.',
                    fr: 'Assemblez tous types de meubles, y compris les commodes, les lits et les tables.',
                    ar: 'تجميع جميع أنواع الأثاث بما في ذلك الخزائن والأسرة والطاولات.'
                }
            },
            {
                id: 'ikea_assembly',
                name: 'IKEA / Flat-Pack Assembly',
                pricingArchetype: 'fixed',
                desc: {
                    en: 'Expert assembly of IKEA or any flat-pack furniture.',
                    fr: 'Montage expert de meubles IKEA ou tout meuble en kit.',
                    ar: 'تجميع خبير لأثاث IKEA أو أي أثاث في صناديق.'
                }
            },
            {
                id: 'crib_assembly',
                name: 'Crib Assembly',
                pricingArchetype: 'fixed',
                desc: {
                    en: 'Safe and secure assembly of baby cribs and nursery furniture.',
                    fr: 'Montage sûr et sécurisé de berceaux et de meubles de chambre de bébé.',
                    ar: 'تجميع آمن ومضمون لمهود الأطفال وأثاث الحضانة.'
                }
            },
            {
                id: 'bookshelf_assembly',
                name: 'Bookshelf Assembly',
                pricingArchetype: 'fixed',
                desc: {
                    en: 'Assemble bookshelves, storage units, and library systems.',
                    fr: 'Assemblez des bibliothèques, des vitrines et des systèmes de rangement.',
                    ar: 'تجميع أرفف الكتب ووحدات التخزين وأنظمة المكتبات.'
                }
            },
            {
                id: 'desk_assembly',
                name: 'Desk Assembly',
                pricingArchetype: 'fixed',
                desc: {
                    en: 'Assembly of office desks, workstations, and computer tables.',
                    fr: 'Montage de bureaux, de postes de travail et de tables informatiques.',
                    ar: 'تجميع مكاتب العمل ومحطات العمل وطاولات الكمبيوتر.'
                }
            }
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
                pricingArchetype: 'hourly',
                desc: {
                    en: 'Help with moving boxes and furniture within the same city.',
                    fr: 'Aide au déménagement de cartons et de meubles dans la même ville.',
                    ar: 'المساعدة في نقل الصناديق والأثاث داخل نفس المدينة.'
                }
            },
            { id: 'packing', name: 'Packing Services', pricingArchetype: 'hourly' },
            { id: 'furniture_move', name: 'Furniture Moving Only', pricingArchetype: 'hourly' }
        ]
    },
    home_repairs: {
        id: 'home_repairs',
        name: 'Home repairs',
        icon: Hammer,
        subServices: [
            {
                id: 'general_repairs',
                name: 'General Repairs',
                pricingArchetype: 'hourly',
                desc: {
                    en: 'Small fixes around the house like fixing a leaky roof or a squeaky door.',
                    fr: 'Petites réparations dans la maison comme réparer un toit qui fuit ou une porte qui grince.',
                    ar: 'إصلاحات صغيرة في جميع أنحاء المنزل مثل إصلاح سقف يسرب أو باب يصدر صريراً.'
                }
            },
            { id: 'door_lock_repair', name: 'Door & Lock Repair', pricingArchetype: 'fixed' },
            { id: 'furniture_fixes', name: 'Furniture Fixes', pricingArchetype: 'fixed' },
            { id: 'shelf_mounting', name: 'Shelf Mounting', pricingArchetype: 'fixed' },
            { id: 'caulking_grouting', name: 'Caulking & Grouting', pricingArchetype: 'hourly' },
            { id: 'wall_repair', name: 'Wall Repair', pricingArchetype: 'fixed' },
            { id: 'appliance_install', name: 'Appliance Installation & Repairs', pricingArchetype: 'fixed' },
            { id: 'window_blinds_repair', name: 'Window & Blinds Repair', pricingArchetype: 'fixed' },
            { id: 'flooring_tiling', name: 'Flooring & Tiling Help', pricingArchetype: 'hourly' },
            { id: 'electrical_help', name: 'Electrical Help', pricingArchetype: 'hourly' },
            { id: 'plumbing_help', name: 'Plumbing Help', pricingArchetype: 'hourly' },
            { id: 'light_carpentry', name: 'Light Carpentry', pricingArchetype: 'hourly' },
        ]
    },
    mounting: {
        id: 'mounting',
        name: 'Mounting',
        icon: Monitor,
        subServices: [
            { id: 'hang_art', name: 'Hang Art, Mirror & Decor', pricingArchetype: 'fixed' },
            { id: 'install_blinds', name: 'Install Blinds & Window Treatments', pricingArchetype: 'fixed' },
            { id: 'mount_furniture', name: 'Mount & Anchor Furniture', pricingArchetype: 'fixed' },
            { id: 'install_shelves', name: 'Install Shelves, Rods & Hooks', pricingArchetype: 'fixed' },
            { id: 'other_mounting', name: 'Other Mounting', pricingArchetype: 'hourly' },
            { id: 'tv_mounting', name: 'TV Mounting', pricingArchetype: 'fixed' }
        ]
    },

    // 2. Home Infrastructure & Restoration
    plumbing: {
        id: 'plumbing',
        name: 'Plumbing',
        icon: Droplets,
        subServices: [
            {
                id: 'general_plumbing',
                name: 'General Plumbing',
                pricingArchetype: 'hourly',
                desc: {
                    en: 'Standard plumbing fixes such as leaky faucets, or drain issues.',
                    fr: 'Réparations de plomberie standard comme des robinets qui fuient ou des problèmes de vidange.',
                    ar: 'إصلاحات سباكة قياسية مثل تسريب الحنفيات أو مشكلات الصرف.'
                }
            },
            { id: 'heavy_plumbing', name: 'Heavy Plumbing tasks', pricingArchetype: 'hourly' }
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
                pricingArchetype: 'hourly',
                desc: {
                    en: 'Safe installation or replacement of electrical wiring in residential buildings.',
                    fr: 'Installation ou remplacement sécurisé du câblage électrique dans les bâtiments résidentiels.',
                    ar: 'التركيب الآمن أو استبدال الأسلاك الكهربائية في المباني السكنية.'
                }
            },
            { id: 'outlet_install', name: 'Outlet Installation', pricingArchetype: 'fixed' },
            { id: 'light_install', name: 'Light Fixture Installation', pricingArchetype: 'fixed' },
            { id: 'circuit_repair', name: 'Circuit Breaker Repair', pricingArchetype: 'fixed' },
            { id: 'cooling_heating', name: 'Heating/cooling systems', pricingArchetype: 'hourly' },
            { id: 'ev_charger', name: 'EVs charger', pricingArchetype: 'fixed' },
            { id: 'surveillance_cameras', name: 'Camera installation', pricingArchetype: 'fixed' }
        ]
    },
    painting: {
        id: 'painting',
        name: 'Painting',
        icon: PenTool,
        subServices: [
            { id: 'indoor_painting', name: 'Indoor Painting', pricingArchetype: 'unit' },
            { id: 'outdoor_painting', name: 'Outdoor Painting', pricingArchetype: 'unit' },
            { id: 'concrete_brick_painting', name: 'Concrete & Brick Painting', pricingArchetype: 'unit' },
            { id: 'wallpapering', name: 'Wallpapering', pricingArchetype: 'unit' }
        ]
    },

    // 3. Recurring Maintenance & Errands
    cleaning: {
        id: 'cleaning',
        name: 'Cleaning',
        icon: Trash2,
        subServices: [
            { id: 'family_home', name: 'Family home cleaning', pricingArchetype: 'unit' },
            { id: 'hospitality', name: 'Hospitality-level cleaning', pricingArchetype: 'unit' }
        ]
    },
    automotive: {
        id: 'automotive',
        name: 'My Car & Transport',
        icon: Car,
        subServices: [
            { id: 'car_wash', name: 'Car Wash', pricingArchetype: 'fixed' },
            { id: 'car_detail', name: 'Car Detailing', pricingArchetype: 'fixed' },
            { id: 'automotive_glass', name: 'Automotive Glass', pricingArchetype: 'fixed' },
            { id: 'car_rental', name: 'Car Rental', pricingArchetype: 'rental' },
            { id: 'private_driver', name: 'Private Driver', pricingArchetype: 'rental' },
            { id: 'vip_airport', name: 'VIP Airport Transfer', pricingArchetype: 'fixed' }
        ]
    },
    errands: {
        id: 'errands',
        name: 'Errands',
        icon: PackageCheck,
        subServices: [
            { id: 'grocery_shopping', name: 'Grocery Shopping', pricingArchetype: 'fixed' },
            { id: 'pharmacy_pickup', name: 'Pharmacy Pickup', pricingArchetype: 'fixed' },
            { id: 'general_delivery', name: 'General Pickup & Drop-off', pricingArchetype: 'fixed' },
            { id: 'post_office', name: 'Post Office / Mailing', pricingArchetype: 'fixed' },
            { id: 'returns', name: 'In-store Returns', pricingArchetype: 'fixed' }
        ]
    },
    glass_cleaning: {
        id: 'glass_cleaning',
        name: 'Glass cleaning',
        icon: Droplets,
        subServices: [
            { id: 'residential_glass', name: 'Residential Glass', pricingArchetype: 'unit' },
            { id: 'commercial_glass', name: 'Commercial/Office Glass', pricingArchetype: 'unit' },
            { id: 'specialty_glass', name: 'Specialty/Hard-to-Clean Glass', pricingArchetype: 'hourly' },
            { id: 'alternative_surfaces', name: 'Alternative Surfaces (Mirrors, Stainless Steel)', pricingArchetype: 'hourly' }
        ]
    },
    gardening: {
        id: 'gardening',
        name: 'Gardening',
        icon: Leaf,
        subServices: [
            { id: 'lawn_mowing', name: 'Lawn Mowing', pricingArchetype: 'hourly' },
            { id: 'yard_work', name: 'Yard Work', pricingArchetype: 'hourly' },
            { id: 'branch_hedge_trimming', name: 'Branch & Hedge Trimming', pricingArchetype: 'hourly' }
        ]
    },

    // 4. High-Trust & Niche Services
    babysitting: {
        id: 'babysitting',
        name: 'Babysitting',
        icon: Baby,
        subServices: [
            {
                id: 'regular_babysitting',
                name: 'Regular Babysitting',
                pricingArchetype: 'hourly',
                desc: {
                    en: 'Day-to-day childcare services including playing, feeding, and basic care.',
                    fr: 'Services de garde d\'enfants au quotidien, y compris les jeux, les repas et les soins de base.',
                    ar: 'خدمات رعاية الأطفال اليومية بما في ذلك اللعب والتغذية والرعاية الأساسية.'
                }
            }
        ]
    },
    pool_cleaning: {
        id: 'pool_cleaning',
        name: 'Pool cleaning',
        icon: Waves,
        subServices: [
            { id: 'chemical_balancing', name: 'Chemical Balancing', pricingArchetype: 'fixed' },
            { id: 'skimming_vacuuming', name: 'Skimming & Vacuuming', pricingArchetype: 'hourly' },
            { id: 'filter_cleaning', name: 'Filter Cleaning', pricingArchetype: 'fixed' },
            { id: 'seasonal_opening', name: 'Opening / Closing', pricingArchetype: 'fixed' },
            { id: 'tile_brushing', name: 'Tile & Wall Brushing', pricingArchetype: 'hourly' }
        ]
    },
    pets_care: {
        id: 'pets_care',
        name: 'Pets care',
        icon: Dog,
        subServices: [
            { id: 'dog_walking', name: 'Dog Walking', pricingArchetype: 'hourly' },
            { id: 'pet_sitting', name: 'Pet Sitting', pricingArchetype: 'hourly' },
            { id: 'pet_grooming', name: 'Pet Grooming', pricingArchetype: 'fixed' },
            { id: 'pet_feeding', name: 'Feeding & Check-ins', pricingArchetype: 'fixed' },
            { id: 'pet_transport', name: 'Pet Transportation', pricingArchetype: 'fixed' }
        ]
    },
    elderly_care: {
        id: 'elderly_care',
        name: 'Elderly care',
        icon: HeartHandshake,
        subServices: [
            { id: 'companionship', name: 'Companionship & Visits', pricingArchetype: 'hourly' },
            { id: 'personal_assistance', name: 'Personal Assistance', pricingArchetype: 'hourly' },
            { id: 'medication_reminders', name: 'Medication Reminders', pricingArchetype: 'fixed' },
            { id: 'meal_preparation', name: 'Meal Preparation', pricingArchetype: 'fixed' },
            { id: 'light_housekeeping', name: 'Light Housekeeping', pricingArchetype: 'hourly' },
            { id: 'transportation_errands', name: 'Transportation & Errands', pricingArchetype: 'fixed' }
        ]
    },

    // 5. Lifestyle & Experience
    cooking: {
        id: 'cooking',
        name: 'Cooking',
        icon: Utensils,
        subServices: [
            { id: 'breakfast', name: 'Breakfast', pricingArchetype: 'fixed' },
            { id: 'lunch', name: 'Lunch', pricingArchetype: 'fixed' },
            { id: 'dinner', name: 'Dinner', pricingArchetype: 'fixed' },
            { id: 'moroccan_cooking', name: 'Moroccan Cooking Class', pricingArchetype: 'fixed' },
            { id: 'private_chef', name: 'Private Chef at Home', pricingArchetype: 'hourly' },
            { id: 'pastry_class', name: 'Moroccan Pastry Workshop', pricingArchetype: 'fixed' },
            { id: 'market_tour_cooking', name: 'Market Tour & Cooking', pricingArchetype: 'fixed' }
        ]
    },
    learn_arabic: {
        id: 'learn_arabic',
        name: 'Learn Arabic',
        icon: Languages,
        subServices: [
            { id: 'darija_intro', name: 'Intro to Moroccan Darija', pricingArchetype: 'hourly' },
            { id: 'conversational_arabic', name: 'Conversational Practice', pricingArchetype: 'hourly' },
            { id: 'arabic_calligraphy', name: 'Arabic Calligraphy Intro', pricingArchetype: 'hourly' },
            { id: 'survival_arabic', name: 'Survival Arabic for Tourists', pricingArchetype: 'hourly' }
        ]
    },
    tour_guide: {
        id: 'tour_guide',
        name: 'Tour Guide',
        icon: MapIcon,
        subServices: [
            { id: 'city_tour', name: 'City Tour', pricingArchetype: 'hourly' },
            { id: 'historical_tour', name: 'Historical Sites Tour', pricingArchetype: 'hourly' },
            { id: 'food_tour', name: 'Moroccan Food Tour', pricingArchetype: 'fixed' },
            { id: 'medina_shopping', name: 'Medina Shopping Guide', pricingArchetype: 'hourly' }
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
    if (id.includes('driver')) return '/Images/Vectors Illu/privateDriver.png';
    if (id.includes('arabic') || id.includes('learn')) return '/Images/Vectors Illu/Arabic Letter.webp';
    if (id.includes('tour') || id.includes('guide')) return '/Images/Vectors Illu/de099bb06d30cd9d1c5744cc227c189f-Photoroom.webp';
    if (id.includes('car_rental') || id.includes('rent')) return '/Images/Vectors Illu/carKey.png';

    return '/Images/Service Category vectors/HandymanVector.webp'; // Fallback
};
