import { 
    Hammer, Package, Trash2, Droplets, Lightbulb, PenTool, 
    Truck, Wrench, Monitor, Leaf, Utensils, Soup, Baby, 
    HeartPulse, Car, Key, PackageCheck, Plane, Navigation, 
    Map as MapIcon, Languages
} from 'lucide-react';

export interface ServiceCategory {
    id: string;
    name: { en: string; fr: string; ar?: string };
    icon: any;
}

export const SERVICE_CATEGORIES: ServiceCategory[] = [
    { id: 'home_repairs', name: { en: 'Home repairs', fr: 'Bricolage', ar: 'إصلاحات منزلية' }, icon: Hammer },
    { id: 'furniture_assembly', name: { en: 'Furniture assembly', fr: 'Montage meubles', ar: 'تركيب الأثاث' }, icon: Package },
    { id: 'cleaning', name: { en: 'Cleaning', fr: 'Nettoyage', ar: 'تنظيف' }, icon: Trash2 },
    { id: 'plumbing', name: { en: 'Plumbing', fr: 'Plomberie', ar: 'سباكة' }, icon: Droplets },
    { id: 'electricity', name: { en: 'Electricity', fr: 'Électricité', ar: 'كهرباء' }, icon: Lightbulb },
    { id: 'painting', name: { en: 'Painting', fr: 'Peinture', ar: 'صباغة' }, icon: PenTool },
    { id: 'moving', name: { en: 'Moving', fr: 'Déménagement', ar: 'مساعدة في النقل' }, icon: Truck },
    { id: 'appliance_installation', name: { en: 'Appliances', fr: 'Électroménagers', ar: 'الأجهزة المنزلية' }, icon: Wrench },
    { id: 'mounting', name: { en: 'Mounting', fr: 'Montage', ar: 'تثبيت وتوريد' }, icon: Monitor },
    { id: 'gardening', name: { en: 'Gardening', fr: 'Jardinage', ar: 'بستنة' }, icon: Leaf },
    { id: 'cooking', name: { en: 'Cooking', fr: 'Cuisine', ar: 'طبخ' }, icon: Utensils },
    { id: 'meal_prep', name: { en: 'Meal prep', fr: 'Préparation repas', ar: 'تحضير الطعام' }, icon: Soup },
    { id: 'babysitting', name: { en: 'Babysitting', fr: 'Garde d\'enfants', ar: 'جليسة أطفال' }, icon: Baby },
    { id: 'elderly_care', name: { en: 'Elderly care', fr: 'Maintien domicile', ar: 'رعاية المسنين' }, icon: HeartPulse },
    { id: 'driver', name: { en: 'Driver', fr: 'Chauffeur', ar: 'سائق' }, icon: Car },
    { id: 'car_rental', name: { en: 'Car rental', fr: 'Location voiture', ar: 'كراء السيارات' }, icon: Key },
    { id: 'courier', name: { en: 'Courier', fr: 'Coursier', ar: 'توصيل' }, icon: PackageCheck },
    { id: 'airport', name: { en: 'Airport', fr: 'Aéroport', ar: 'النقل من المطار' }, icon: Plane },
    { id: 'transport_city', name: { en: 'City transport', fr: 'Transport urbain', ar: 'نقل حضري' }, icon: Navigation },
    { id: 'transport_intercity', name: { en: 'Intercity', fr: 'Interurbain', ar: 'نقل بين المدن' }, icon: MapIcon },
    { id: 'private_driver', name: { en: 'Private Driver', fr: 'Chauffeur Privé', ar: 'سائق خاص' }, icon: Car },
    { id: 'learn_arabic', name: { en: 'Learn Arabic', fr: 'Apprendre l’Arabe', ar: 'تعلم العربية' }, icon: Languages },
    { id: 'tour_guide', name: { en: 'Tour Guide', fr: 'Guide Touristique', ar: 'مرشد سياحي' }, icon: MapIcon },
];

export const TIME_SLOTS = [
    "06:00", "06:30", "07:00", "07:30", "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
    "11:00", "11:30", "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30",
    "16:00", "16:30", "17:00", "17:30", "18:00", "18:30", "19:00", "19:30", "20:00", "20:30",
    "21:00", "21:30", "22:00", "22:30", "23:00", "23:30"
];

export const AVAILABILITY_SLOTS = {
    morning: ["08:00", "09:00", "10:00", "11:00", "12:00"],
    afternoon: ["13:00", "14:00", "15:00", "16:00", "17:00"],
    evening: ["18:00", "19:00", "20:00", "21:00"]
};
