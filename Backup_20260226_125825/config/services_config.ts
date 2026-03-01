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
    Car,
    Key,
    Plane,
    Map,
    type LucideIcon
} from 'lucide-react';

export interface SubService {
    id: string;
    name: string;
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
            { id: 'general_assembly', name: 'General Furniture Assembly' },
            { id: 'ikea_flatpack', name: 'IKEA / Flat-Pack Assembly' },
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
            { id: 'local_move', name: 'Local Moving' },
            { id: 'packing', name: 'Packing Services' },
            { id: 'furniture_move', name: 'Furniture Moving Only' }
        ]
    },
    handyman: {
        id: 'handyman',
        name: 'Handyman / small repairs',
        icon: Hammer,
        subServices: [
            { id: 'general_repairs', name: 'General Repairs' },
            { id: 'door_lock', name: 'Door & Lock Repair' },
            { id: 'furniture_fix', name: 'Furniture Fixes' },
            { id: 'shelf_mounting', name: 'Shelf Mounting' },
            { id: 'caulking', name: 'Caulking & Grouting' }
        ]
    },
    mounting: {
        id: 'mounting',
        name: 'Mounting (TV, shelves, curtains)',
        icon: Monitor,
        subServices: [
            { id: 'tv_mount', name: 'TV Mounting' },
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
            { id: 'leak_repair', name: 'Leak Repair' },
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
            { id: 'wiring', name: 'Wiring & Rewiring' },
            { id: 'outlet_install', name: 'Outlet Installation' },
            { id: 'light_install', name: 'Light Fixture Installation' },
            { id: 'circuit_repair', name: 'Circuit Breaker Repair' }
        ]
    },
    painting: {
        id: 'painting',
        name: 'Painting',
        icon: PenTool,
        subServices: [
            { id: 'interior', name: 'Interior Painting' },
            { id: 'exterior', name: 'Exterior Painting' },
            { id: 'wallpaper', name: 'Wallpaper Installation' }
        ]
    },
    appliance_installation: {
        id: 'appliance_installation',
        name: 'Appliance installation',
        icon: Wrench,
        subServices: [
            { id: 'washing_machine', name: 'Washing Machine' },
            { id: 'dishwasher', name: 'Dishwasher' },
            { id: 'refrigerator', name: 'Refrigerator' },
            { id: 'oven', name: 'Oven/Stove' }
        ]
    },

    // Phase 3: Recurring Maintenance & Errands
    cleaning: {
        id: 'cleaning',
        name: 'Cleaning',
        icon: Trash2,
        subServices: [
            { id: 'family_home', name: 'Family Home Cleaning' },
            { id: 'hospitality', name: 'Airbnb Cleaning' },
            { id: 'car_wash', name: 'Car Washing' },
            { id: 'car_detail', name: 'Car Detailing' },
            { id: 'deep_clean', name: 'Deep Home Cleaning' }
        ]
    },
    errands: {
        id: 'errands',
        name: 'Errands & small deliveries',
        icon: PackageCheck,
        subServices: []
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
        subServices: []
    },
    elderly_assistance: {
        id: 'elderly_assistance',
        name: 'Elderly assistance',
        icon: HeartPulse,
        subServices: []
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
        icon: Map,
        subServices: []
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
    if (!serviceIdOrName) return '/Images/Service Category vectors/HandymanVector.png';
    const id = serviceIdOrName.toLowerCase();

    if (id.includes('handyman') || id.includes('repair')) return '/Images/Service Category vectors/HandymanVector.png';
    if (id.includes('assembly')) return '/Images/Service Category vectors/AsssemblyVector.png';
    if (id.includes('mounting')) return '/Images/Service Category vectors/MountingVector.png';
    if (id.includes('moving')) return '/Images/Service Category vectors/MovingHelpVector.png';
    if (id.includes('glass')) return '/Images/Service Category vectors/Glass cleaning.png';
    if (id.includes('cleaning')) return '/Images/Service Category vectors/CleaningVector.png';
    if (id.includes('gardening')) return '/Images/Service Category vectors/GardeningVector.png';
    if (id.includes('plumbing')) return '/Images/Service Category vectors/PlumbingVector.png';
    if (id.includes('electricity')) return '/Images/Service Category vectors/ElectricityVector.png';
    if (id.includes('painting')) return '/Images/Service Category vectors/Paintingvector.png';
    if (id.includes('babysitting')) return '/Images/Service Category vectors/babysettingnVector.png';
    if (id.includes('appliance')) return '/Images/Service Category vectors/homerepairVector.png';

    return '/Images/Service Category vectors/HandymanVector.png'; // Fallback
};
