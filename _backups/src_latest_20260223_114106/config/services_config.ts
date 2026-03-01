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
    // Domestic Services
    cleaning: {
        id: 'cleaning',
        name: 'Cleaning',
        icon: Trash2,
        subServices: [
            { id: 'family_home', name: 'Family Home Cleaning' },
            { id: 'hospitality', name: 'Hospitality-level Cleaning (Airbnb, Booking.com)' },
            { id: 'car_wash', name: 'Car Washing' },
            { id: 'car_detail', name: 'Car Detailing' },
            { id: 'deep_clean', name: 'Deep Home Cleaning' }
        ]
    },
    glass_cleaning: {
        id: 'glass_cleaning',
        name: 'Glass',
        icon: Droplets,
        subServices: [
            { id: 'residential_glass', name: 'Residential Glass' },
            { id: 'commercial_glass', name: 'Commercial/Office Glass' },
            { id: 'automotive_glass', name: 'Automotive Glass' },
            { id: 'specialty_glass', name: 'Specialty/Hard-to-Clean Glass' },
            { id: 'alternative_surfaces', name: 'Alternative Surfaces (Mirrors, Stainless Steel)' }
        ]
    },
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
    handyman: {
        id: 'handyman',
        name: 'Handyman / small repairs',
        icon: Hammer,
        subServices: [] // No sub-services
    },
    furniture_assembly: {
        id: 'furniture_assembly',
        name: 'Furniture assembly',
        icon: Package,
        subServices: []
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
    mounting: {
        id: 'mounting',
        name: 'Mounting (TV, shelves, curtains)',
        icon: Monitor,
        subServices: [
            { id: 'tv_mount', name: 'TV Mounting' },
            { id: 'shelf_mount', name: 'Shelf Installation' },
            { id: 'curtain_mount', name: 'Curtain Rod Installation' }
        ]
    },
    errands: {
        id: 'errands',
        name: 'Errands & small deliveries',
        icon: PackageCheck,
        subServices: []
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
export const getServiceById = (idOrName: string): ServiceConfig | undefined => {
    // 1. Direct ID lookup
    if (SERVICES_HIERARCHY[idOrName]) return SERVICES_HIERARCHY[idOrName];

    // 2. Case-insensitive ID lookup
    const lower = idOrName.toLowerCase();
    if (SERVICES_HIERARCHY[lower]) return SERVICES_HIERARCHY[lower];

    // 3. Name lookup (case-insensitive)
    return Object.values(SERVICES_HIERARCHY).find(s =>
        s.name === idOrName || s.name.toLowerCase() === lower
    );
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
