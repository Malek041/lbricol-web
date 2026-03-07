"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MapPin, ChevronDown, Search, X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getServiceById } from '@/config/services_config';
import { useLanguage } from '@/context/LanguageContext';
import { ReviewsScrollingSection } from './ReviewsScrollingSection';
import { ClientOnboarding } from './ClientOnboarding';
import SplashScreen from '@/components/layout/SplashScreen';

// ── Palette ────────────────────────────────────────────────────────────────
const G_GREEN = '#00A082';

// ── Service catalogue ─────────────────────────────────────────────────────
interface ServiceEntry {
    id: string;
    label: string;
    labelFr: string;
    labelAr?: string;
    iconPath: string;
    subServices: { en: string; fr: string; ar?: string }[];
    bullets: { en: string; fr: string; ar?: string }[];
    heroImage: string; // local /Images/Job Cards Images/ path
}

// Map each service to its local job-card image
const SERVICES: ServiceEntry[] = [
    {
        id: 'handyman',
        label: 'Handyman',
        labelFr: 'Bricoleur',
        labelAr: 'بري كول',
        iconPath: '/Images/Service Category vectors/HandymanVector.webp',
        subServices: [
            { en: 'General Repairs', fr: 'Réparations Générales', ar: 'إصلاحات عامة' },
            { en: 'Door & Lock Repair', fr: 'Réparation de Portes et Serrures', ar: 'إصلاح الأبواب والأقفال' },
            { en: 'Furniture Fixes', fr: 'Réparation de Meubles', ar: 'إصلاح الأثاث' },
            { en: 'Shelf Mounting', fr: 'Montage d\'Étagères', ar: 'تركيب الرفوف' },
            { en: 'Caulking & Grouting', fr: 'Calfeutrage et Jointoiement', ar: 'سد الفجوات والجص' }
        ],
        bullets: [
            { en: 'From leaky taps to broken hinges, we fix it all.', fr: 'Des robinets qui fuient aux charnières cassées, nous réparons tout.', ar: 'من الصنابير التي تسرب إلى المفصلات المكسورة، نصلح كل شيء.' },
            { en: 'Now Trending: Smart-home gadget installations.', fr: 'Tendance actuelle : Installations de gadgets pour maison intelligente.', ar: 'رائج الآن: تركيب أجهزة المنزل الذكي.' },
        ],
        heroImage: '/Images/Job Cards Images/Handyman_job_card.webp',
    },
    {
        id: 'furniture_assembly',
        label: 'Assembly',
        labelFr: 'Montage',
        labelAr: 'تركيب الأثاث',
        iconPath: '/Images/Service Category vectors/AsssemblyVector.webp',
        subServices: [
            { en: 'General Furniture Assembly', fr: 'Montage de Meubles Général', ar: 'تركيب أثاث عام' },
            { en: 'IKEA / Flat-Pack Assembly', fr: 'Montage IKEA / Kit', ar: 'تركيب أثاث ايكيا / أثاث جاهز' },
            { en: 'Crib Assembly', fr: 'Montage de Berceau', ar: 'تركيب سرير أطفال' },
            { en: 'Bookshelf Assembly', fr: 'Montage de Bibliothèque', ar: 'تركيب مكتبة كتب' },
            { en: 'Desk Assembly', fr: 'Montage de Bureau', ar: 'تركيب مكتب' }
        ],
        bullets: [
            { en: 'Assemble or disassemble furniture items by unboxing, building, and any cleanup.', fr: 'Montez ou démontez des meubles en déballant, assemblant et nettoyant.', ar: 'تركيب أو فك الأثاث مع التفريغ والبناء والتنظيف.' },
            { en: 'Now Trending: Curved sofas, computer desks & sustainable materials.', fr: 'Tendance actuelle : Canapés courbés, bureaux d\'ordinateur et matériaux durables.', ar: 'رائج الآن: أرائك منحنية، مكاتب كمبيوتر ومواد مستدامة.' },
        ],
        heroImage: '/Images/Job Cards Images/Furniture_Assembly_job_card.webp',
    },
    {
        id: 'mounting',
        label: 'Mounting',
        labelFr: 'Fixation murale',
        labelAr: 'تعليق جداري',
        iconPath: '/Images/Service Category vectors/MountingVector.webp',
        subServices: [
            { en: 'TV Mounting', fr: 'Montage de TV', ar: 'تركيب التلفزيون' },
            { en: 'Shelf Installation', fr: 'Installation d\'Étagères', ar: 'تركيب الرفوف' },
            { en: 'Curtain Rod Installation', fr: 'Installation de Tringles à Rideaux', ar: 'تركيب قضبان الستائر' },
            { en: 'Mirror Hanging', fr: 'Accrochage de Miroirs', ar: 'تعليق المرايا' },
            { en: 'Picture Hanging', fr: 'Accrochage de Tableaux', ar: 'تعليق اللوحات' }
        ],
        bullets: [
            { en: 'Securely mount your TV, shelves, art, mirrors, dressers, and more.', fr: 'Montez en toute sécurité votre TV, vos étagères, vos tableaux, vos miroirs, vos commodes et bien plus.', ar: 'تعليق التلفزيون، الرفوف، اللوحات، المرايا والمزيد بأمان.' },
            { en: 'Now Trending: Gallery walls, art TVs & wraparound bookcases.', fr: 'Tendance actuelle : Murs de galerie, TV artistiques et bibliothèques d\'angle.', ar: 'رائج الآن: جدران المعارض، أجهزة تلفزيون فنية ومكتبات زاوية.' },
        ],
        heroImage: '/Images/Job Cards Images/Handyman_job_card.webp', // closest match
    },
    {
        id: 'moving',
        label: 'Moving',
        labelFr: 'Déménagement',
        labelAr: 'نقل وأثاث',
        iconPath: '/Images/Service Category vectors/MovingHelpVector.webp',
        subServices: [
            { en: 'Local Moving', fr: 'Déménagement Local', ar: 'نقل محلي' },
            { en: 'Packing Services', fr: 'Services d\'Emballage', ar: 'خدمات التغليف' },
            { en: 'Furniture Moving Only', fr: 'Déménagement de Meubles Uniquement', ar: 'نقل الأثاث فقط' },
            { en: 'Heavy Item Hauling', fr: 'Transport d\'Articles Lourds', ar: 'نقل الأشياء الثقيلة' }
        ],
        bullets: [
            { en: 'Professional movers handle packing, loading and transport.', fr: 'Des déménageurs professionnels gèrent l\'emballage, le chargement et le transport.', ar: 'عمال محترفون يتعاملون مع التغليف والتحميل والنقل.' },
            { en: 'Now Trending: Same-day apartment moves in under 3 hours.', fr: 'Tendance actuelle : Déménagements d\'appartements le jour même en moins de 3 heures.', ar: 'رائج الآن: نقل الشقق في نفس اليوم في أقل من 3 ساعات.' },
        ],
        heroImage: '/Images/Job Cards Images/Moving Help_job_card.webp',
    },
    {
        id: 'cleaning',
        label: 'Cleaning',
        labelFr: 'Nettoyage',
        labelAr: 'خادمة / تنظيف',
        iconPath: '/Images/Service Category vectors/CleaningVector.webp',
        subServices: [
            { en: 'Family Home Cleaning', fr: 'Nettoyage de Maison Familiale', ar: 'تنظيف منزل عائلي' },
            { en: 'Airbnb Cleaning', fr: 'Nettoyage Airbnb', ar: 'تنظيف شقق Airbnb' },
            { en: 'Car Washing', fr: 'Lavage de Voiture', ar: 'غسل السيارات' },
            { en: 'Car Detailing', fr: 'Nettoyage Détaillé de Voiture', ar: 'تنظيف سيارات دقيق' },
            { en: 'Deep Home Cleaning', fr: 'Nettoyage en Profondeur de Maison', ar: 'تنظيف منزل عميق' }
        ],
        bullets: [
            { en: 'Clean your home or office; deep-clean appliances and other spaces.', fr: 'Nettoyez votre maison ou votre bureau ; nettoyez en profondeur les appareils ménagers et d\'autres espaces.', ar: 'تنظيف منزلك أو مكتبك؛ تنظيف عميق للأجهزة والمساحات الأخرى.' },
            { en: 'Now Trending: Eco-friendly products, home cleaning checklists, and cleaning hacks.', fr: 'Tendance actuelle : Produits écologiques, listes de contrôle de nettoyage à domicile et astuces de nettoyage.', ar: 'رائج الآن: منتجات صديقة للبيئة، قوائم فحص التنظيف وحيل التنظيف.' },
        ],
        heroImage: '/Images/Job Cards Images/Cleaning_job_card.webp',
    },
    {
        id: 'glass_cleaning',
        label: 'Glass cleaning',
        labelFr: 'Nettoyage de vitres',
        labelAr: 'تنظيف الزجاج',
        iconPath: '/Images/Service Category vectors/Glass cleaning.webp',
        subServices: [
            { en: 'Residential Glass', fr: 'Vitres Résidentielles', ar: 'زجاج سكني' },
            { en: 'Commercial/Office Glass', fr: 'Vitres Commerciales / de Bureau', ar: 'زجاج تجاري / مكاتب' },
            { en: 'Automotive Glass', fr: 'Vitres Automobiles', ar: 'زجاج سيارات' },
            { en: 'Specialty/Hard-to-Clean Glass', fr: 'Vitres Spéciales / Difficiles à Nettoyer', ar: 'زجاج خاص / صعب التنظيف' }
        ],
        bullets: [
            { en: 'Streak-free cleaning for windows, mirrors and specialty glass.', fr: 'Nettoyage sans traces pour les fenêtres, les miroirs et les vitres spéciales.', ar: 'تنظيف بدون أثر للنوافذ والمرايا والزجاج الخاص.' },
            { en: 'Now Trending: Eco-friendly streak-free formulas.', fr: 'Tendance actuelle : Formules écologiques sans traces.', ar: 'رائج الآن: تركيبات صديقة للبيئة بدون أثر.' },
        ],
        heroImage: '/Images/Job Cards Images/Cleaning_job_card.webp', // reusing cleaning image for now
    },
    {
        id: 'gardening',
        label: 'Gardening',
        labelFr: 'Jardinage',
        labelAr: 'بستنة وحدائق',
        iconPath: '/Images/Service Category vectors/GardeningVector.webp',
        subServices: [
            { en: 'Lawn Mowing', fr: 'Tonte de Pelouse', ar: 'قص العشب' },
            { en: 'Tree Trimming', fr: 'Taille d\'Arbres', ar: 'تقليم الأشجار' },
            { en: 'Planting & Landscaping', fr: 'Plantation et Aménagement Paysager', ar: 'زراعة وتنسيق حدائق' },
            { en: 'Garden Cleanup', fr: 'Nettoyage de Jardin', ar: 'تنظيف الحديقة' },
            { en: 'Watering Setup', fr: 'Installation d\'Arrosage', ar: 'تركيب نظام ري' }
        ],
        bullets: [
            { en: 'Keep your outdoor spaces green, tidy and beautiful.', fr: 'Gardez vos espaces extérieurs verts, bien rangés et beaux.', ar: 'حافظ على مساحاتك الخارجية خضراء ومرتبة وجميلة.' },
            { en: 'Now Trending: Vertical gardens and drought-resistant landscaping.', fr: 'Tendance actuelle : Jardins verticaux et aménagement paysager résistant à la sécheresse.', ar: 'رائج الآن: حدائق عمودية وتنسيق حدائق مقاوم للجفاف.' },
        ],
        heroImage: '/Images/Job Cards Images/Gardening_job_card.webp',
    },
    {
        id: 'plumbing',
        label: 'Plumbing',
        labelFr: 'Plomberie',
        labelAr: 'سباك (بلومبي)',
        iconPath: '/Images/Service Category vectors/PlumbingVector.webp',
        subServices: [
            { en: 'Leak Repair', fr: 'Réparation de Fuites', ar: 'إصلاح التسريبات' },
            { en: 'Pipe Installation', fr: 'Installation de Tuyaux', ar: 'تركيب الأنابيب' },
            { en: 'Drain Cleaning', fr: 'Nettoyage de Canalisations', ar: 'تسريح المجاري' },
            { en: 'Faucet Repair', fr: 'Réparation de Robinets', ar: 'إصلاح الصنابير' },
            { en: 'Toilet Repair', fr: 'Réparation de Toilettes', ar: 'إصلاح المراحيض' }
        ],
        bullets: [
            { en: 'Fix leaks, install pipes and keep your water running smoothly.', fr: 'Réparez les fuites, installez des tuyaux et gardez votre eau qui coule en douceur.', ar: 'إصلاح التسريبات، تركيب الأنابيب والحفاظ على تدفق المياه بسلاسة.' },
            { en: 'Now Trending: Pressure-balanced shower fixtures.', fr: 'Tendance actuelle : Appareils de douche à pression équilibrée.', ar: 'رائج الآن: تركيبات دش متوازنة الضغط.' },
        ],
        heroImage: '/Images/Job Cards Images/Plumbing_job_card.webp',
    },
    {
        id: 'electricity',
        label: 'Electricity',
        labelFr: 'Électricité',
        labelAr: 'كهربائي (تريسيان)',
        iconPath: '/Images/Service Category vectors/ElectricityVector.webp',
        subServices: [
            { en: 'Wiring & Rewiring', fr: 'Câبلage et Recâبلage', ar: 'توصيل وتجديد الأسلاك' },
            { en: 'Outlet Installation', fr: 'Installation de Prises', ar: 'تركيب المقابس' },
            { en: 'Light Fixture Installation', fr: 'Installation de Luminaires', ar: 'تركيب الثريات والمصابيح' },
            { en: 'Circuit Breaker Repair', fr: 'Réparation de Disjoncteurs', ar: 'إصلاح قواطع التيار' },
            { en: 'Smart Switch Setup', fr: 'Installation d\'Interrupteurs Intelligents', ar: 'تركيب مفاتيح ذكية' }
        ],
        bullets: [
            { en: 'Safe, certified electrical work by verified professionals.', fr: 'Travaux électriques sûrs et certifiés par des professionnels vérifiés.', ar: 'أعمال كهربائية آمنة ومعتمدة من قبل محترفين موثوقين.' },
            { en: 'Now Trending: Smart lighting and USB outlet installations.', fr: 'Tendance actuelle : Éclairage intelligent et installations de prises USB.', ar: 'رائج الآن: إضاءة ذكية وتركيب مقابس USB.' },
        ],
        heroImage: '/Images/Job Cards Images/Electricity_job_card.webp',
    },
    {
        id: 'painting',
        label: 'Painting',
        labelFr: 'Peinture',
        labelAr: 'صباغ',
        iconPath: '/Images/Service Category vectors/Paintingvector.webp',
        subServices: [
            { en: 'Indoor Painting', fr: 'Peinture Intérieure', ar: 'صباغة داخلية' },
            { en: 'Wallpapering', fr: 'Pose de Papier Peint', ar: 'تركيب ورق الجدران' },
            { en: 'Outdoor Painting', fr: 'Peinture Extérieure', ar: 'صباغة خارجية' },
            { en: 'Concrete & Brick Painting', fr: 'Peinture Béton et Brique', ar: 'صباغة الخرسانة والطوب' },
            { en: 'Accent Wall Painting', fr: 'Mur Accent', ar: 'صباغة حائط تجميلي' },
            { en: 'Wallpaper Removal', fr: 'Dépose de Papier Peint', ar: 'إزالة ورق الجدران' }
        ],
        bullets: [
            { en: 'Transform your spaces with fresh, professional paint jobs.', fr: 'Transformez vos espaces avec des travaux de peinture frais et professionnels.', ar: 'حول مساحاتك بأعمال صباغة احترافية وجديدة.' },
            { en: 'Now Trending: Limewash, textured finishes & feature walls.', fr: 'Tendance actuelle : Peinture à la chaux, finitions texturées et murs caractéristiques.', ar: 'رائج الآن: صباغة جيرية، لمسات بارزة وجدران مميزة.' },
        ],
        heroImage: '/Images/Job Cards Images/Painting_job_card.webp',
    },
    {
        id: 'babysitting',
        label: 'Childcare',
        labelFr: 'Garde d\'enfants',
        labelAr: 'جليسة أطفال',
        iconPath: '/Images/Vectors Illu/babysetting.webp',
        subServices: [
            { en: 'Regular Babysitting', fr: 'Garde Prévue', ar: 'جليسة أطفال عادية' },
            { en: 'After-School Care', fr: 'Garde Après l\'École', ar: 'رعاية بعد المدرسة' },
            { en: 'Night Sitting', fr: 'Garde de Nuit', ar: 'رعاية ليلية' },
            { en: 'Day Out Supervision', fr: 'Surveillance de Journées', ar: 'مرافقة نهارية' }
        ],
        bullets: [
            { en: 'Trusted, background-checked carers for your children.', fr: 'Garde d\'enfants de confiance et vérifiée pour vos enfants.', ar: 'مقدمو رعاية موثوقون ومدققون لأطفالك.' },
            { en: 'Now Trending: Bilingual carers and homework-help sessions.', fr: 'Tendance actuelle : Gardes bilingues et aide aux devoirs.', ar: 'رائج الآن: جليسات ثنائيات اللغة وجلسات مساعدة في الواجبات.' },
        ],
        heroImage: '/Images/Job Cards Images/Babysetting_job_card.webp',
    },
    {
        id: 'appliance_installation',
        label: 'Home Repair',
        labelFr: 'Réparations maison',
        labelAr: 'إصلاحات المنزل',
        iconPath: '/Images/Service Category vectors/homerepairVector.webp',
        subServices: [
            { en: 'Door, Cabinet, & Furniture Repair', fr: 'Réparation Portes, Placards et Meubles', ar: 'إصلاح الأبواب والخزائن والأثاث' },
            { en: 'Wall Repair', fr: 'Réparation de Murs', ar: 'إصلاح الجدران' },
            { en: 'Sealing & Caulking', fr: 'Étanchéité et Calfeutrage', ar: 'ختم وعزل' },
            { en: 'Appliance Installation & Repairs', fr: 'Installation et Réparation d\'Appareils', ar: 'تركيب وإصلاح الأجهزة' },
            { en: 'Window & Blinds Repair', fr: 'Réparation Fenêtres et Stores', ar: 'إصلاح النوافذ والستائر' },
            { en: 'Flooring & Tiling Help', fr: 'Parquet et Carrelage', ar: 'المساعدة في الأرضيات والزليج' },
            { en: 'Electrical Help', fr: 'Aide Électrique', ar: 'مساعدة كهربائية' },
            { en: 'Plumbing Help', fr: 'Aide Plomberie', ar: 'مساعدة في السباكة' },
            { en: 'Light Carpentry', fr: 'Menuiserie Légère', ar: 'نجارة خفيفة' },
            { en: 'Window Winterization', fr: 'Winterisation des Fenêtres', ar: 'عزل النوافذ للشتاء' }
        ],
        bullets: [
            { en: 'From tiling to appliances, we handle it all.', fr: 'De la pose de carrelage aux appareils électroménagers, nous nous occupons de tout.', ar: 'من الزليج إلى الأجهزة، نتعامل مع كل شيء.' },
            { en: 'Now Trending: Feature-wall tiling and open-plan kitchen remodels.', fr: 'Tendance actuelle : Carrelage de murs accentués et rénovations de cuisines ouvertes.', ar: 'رائج الآن: زليج الجدران المميزة وتجديد المطابخ.' },
        ],
        heroImage: '/Images/Job Cards Images/Painting_job_card.webp',
    },
    {
        id: 'pool_cleaning',
        label: 'Pool cleaning',
        labelFr: 'Nettoyage de piscine',
        labelAr: 'تنظيف المسبح',
        iconPath: '/Images/Vectors Illu/Poolcleaning_VI.webp',
        subServices: [
            { en: 'Chemical Balancing', fr: 'Équilibre Chimique', ar: 'توازن كيميائي' },
            { en: 'Skimming & Vacuuming', fr: 'Écrémage et Aspiration', ar: 'إزالة الشوائب والشفط' },
            { en: 'Filter Cleaning', fr: 'Nettoyage du Filtre', ar: 'تنظيف الفلتر' },
            { en: 'Opening / Closing', fr: 'Ouverture / Fermeture', ar: 'فتح / إغلاق' },
            { en: 'Tile & Wall Brushing', fr: 'Brossage des Parois', ar: 'تنظيف البلاط والجدران' }
        ],
        bullets: [
            { en: 'Keep your pool crystal clear and safe for everyone.', fr: 'Gardez votre piscine cristalline et sûre pour tous.', ar: 'حافظ على مسبحك صافياً وآمناً للجميع.' },
            { en: 'Specialized chemical balancing for various pool types.', fr: 'Équilibrage chimique spécialisé pour divers types de piscines.', ar: 'توازن كيميائي متخصص لمختلف أنواع المسابح.' },
        ],
        heroImage: '/Images/Job Cards Images/Pool Cleaning_job_card.webp',
    },
    {
        id: 'pets_care',
        label: 'Pets care',
        labelFr: 'Soins des animaux',
        labelAr: 'رعاية الحيوانات',
        iconPath: '/Images/Vectors Illu/petscare.webp',
        subServices: [
            { en: 'Dog Walking', fr: 'Promenade de Chien', ar: 'تمشية الكلاب' },
            { en: 'Pet Sitting', fr: 'Garde d\'Animaux', ar: 'رعاية الحيوانات' },
            { en: 'Pet Grooming', fr: 'Toilettage d\'Animaux', ar: 'تنظيف وتجميل الحيوانات' },
            { en: 'Feeding & Check-ins', fr: 'Alimentation et Visites', ar: 'إطعام وزيارات متابعة' },
            { en: 'Pet Transportation', fr: 'Transport d\'Animaux', ar: 'نقل الحيوانات' }
        ],
        bullets: [
            { en: 'Professional, background-checked handlers for your pets.', fr: 'Des gardiens professionnels et vérifiés pour vos animaux.', ar: 'مقدمو رعاية محترفون ومدققون لخدمة حيواناتك الأليفة.' },
            { en: 'GPS tracking and photo updates for dog walks.', fr: 'Suivi GPS et photos pendant les promenades.', ar: 'تتبع GPS وتحديثات بالصور أثناء تمشية الكلاب.' },
        ],
        heroImage: '/Images/Job Cards Images/Babysetting_job_card.webp',
    },
    {
        id: 'errands',
        label: 'Errands',
        labelFr: 'Courses',
        labelAr: 'توصيل وقضاء أغراض',
        iconPath: '/Images/Vectors Illu/shoppingbag.webp',
        subServices: [
            { en: 'Grocery Shopping', fr: 'Courses Alimentaires', ar: 'تسوق مواد غذائية' },
            { en: 'Pharmacy Pickup', fr: 'Pharmacie', ar: 'اقتناء أدوية من الصيدلية' },
            { en: 'General Pickup & Drop-off', fr: 'Récupération et Dépôt', ar: 'توصيل واستلام عام' },
            { en: 'Post Office / Mailing', fr: 'Poste / Courrier', ar: 'البريد / الطرود' },
            { en: 'In-store Returns', fr: 'Retours en Magasin', ar: 'إرجاع السلع للمتاجر' }
        ],
        bullets: [
            { en: 'Save time by letting us handle your tasks and errands.', fr: 'Gagnez du temps en nous laissant gérer vos tâches et courses.', ar: 'وفر وقتك واترك لنا قضاء مشاويرك ومهامك.' },
            { en: 'Quick grocery shopping and delivery in under 60 min.', fr: 'Courses et livraison rapides en moins de 60 min.', ar: 'تسوق مواد غذائية سريع وتوصيل في أقل من 60 دقيقة.' },
        ],
        heroImage: '/Images/Job Cards Images/Moving Help_job_card.webp',
    },
    {
        id: 'elderly_care',
        label: 'Elderly care',
        labelFr: 'Aide aux seniors',
        labelAr: 'رعاية المسنين',
        iconPath: '/Images/Vectors Illu/ElderlyCare_VI.webp',
        subServices: [
            { en: 'Companionship & Visits', fr: 'Compagnie et Visites', ar: 'مرافقة وزيارات' },
            { en: 'Personal Assistance', fr: 'Aide Personnelle', ar: 'مساعدة شخصية' },
            { en: 'Medication Reminders', fr: 'Rappels de Médicaments', ar: 'تذكير بالمواعيد الطبية' },
            { en: 'Meal Preparation', fr: 'Préparation des Repas', ar: 'تحضير الوجبات' },
            { en: 'Light Housekeeping', fr: 'Ménage Léger', ar: 'تنظيف خفيف' },
            { en: 'Transportation & Errands', fr: 'Transport et Courses', ar: 'نقل وقضاء أغراض' }
        ],
        bullets: [
            { en: 'Compassionate, background-checked caregivers for your loved ones.', fr: 'Des aidants bienveillants et vérifiés pour vos proches.', ar: 'مقدمو رعاية رحماء ومدققون لأحبائك.' },
            { en: 'Regular visits, companionship, and practical daily support.', fr: 'Visites régulières, compagnie et soutien pratique au quotidien.', ar: 'زيارات منتظمة، رفقة ودعم عملي يومي.' },
        ],
        heroImage: '/Images/Job Cards Images/Babysetting_job_card.webp',
    },
    {
        id: 'cooking',
        label: 'Cooking',
        labelFr: 'Cuisine',
        labelAr: 'طبخ',
        iconPath: '/Images/Vectors Illu/cooking.webp',
        subServices: [
            { en: 'Breakfast', fr: 'Petit-déjeuner', ar: 'فطور' },
            { en: 'Lunch', fr: 'Déjeuner', ar: 'غداء' },
            { en: 'Dinner', fr: 'Dîner', ar: 'عشاء' },
            { en: 'Moroccan Cooking Class', fr: 'Cours de Cuisine Marocaine', ar: 'درس طبخ مغربي' },
            { en: 'Private Chef at Home', fr: 'Chef Privé à Domicile', ar: 'شيف خاص في المنزل' },
            { en: 'Moroccan Pastry Workshop', fr: 'Atelier Pâtisserie Marocaine', ar: 'ورشة حلويات مغربية' },
            { en: 'Market Tour & Cooking', fr: 'Circuit Marché & Cuisine', ar: 'جولة السوق وطبخ' }
        ],
        bullets: [
            { en: 'Authentic home-cooked Moroccan meals by verified local cooks.', fr: 'Plats marocains faits maison par des cuisiniers locaux vérifiés.', ar: 'وجبات مغربية منزلية أصيلة من طباخين محليين موثوقين.' },
            { en: 'Now Trending: Moroccan cooking classes for tourists.', fr: 'Tendance actuelle : Cours de cuisine marocaine pour touristes.', ar: 'رائج الآن: دروس الطبخ المغربي للسياح.' },
        ],
        heroImage: '/Images/Job Cards Images/Cleaning_job_card.webp',
    },
    {
        id: 'tour_guide',
        label: 'Tour Guide',
        labelFr: 'Guide Touristique',
        labelAr: 'مرشد سياحي',
        iconPath: '/Images/Vectors Illu/Traveler.webp',
        subServices: [
            { en: 'City Tour', fr: 'Tour de la Ville', ar: 'جولة في المدينة' },
            { en: 'Historical Sites Tour', fr: 'Visite des Sites Historiques', ar: 'جولة المواقع التاريخية' },
            { en: 'Moroccan Food Tour', fr: 'Circuit Gastronomique Marocain', ar: 'جولة تذوق الطعام المغربي' },
            { en: 'Medina Shopping Guide', fr: 'Guide Shopping Médina', ar: 'دليل تسوق المدينة' }
        ],
        bullets: [
            { en: 'Explore Morocco with a verified local guide who knows every corner.', fr: 'Explorez le Maroc avec un guide local vérifié qui connaît chaque recoin.', ar: 'استكشف المغرب مع مرشد محلي موثوق يعرف كل زاوية.' },
            { en: 'Now Trending: Medina walking tours and sunset desert trips.', fr: 'Tendance actuelle : Visites à pied de la médina et excursions désert au coucher du soleil.', ar: 'رائج الآن: جولات مشي في المدينة ورحلات الصحراء عند غروب الشمس.' },
        ],
        heroImage: '/Images/Job Cards Images/Moving Help_job_card.webp',
    },
    {
        id: 'private_driver',
        label: 'Private Driver',
        labelFr: 'Chauffeur Privé',
        labelAr: 'سائق خاص',
        iconPath: '/Images/Vectors Illu/DriverCar.webp',
        subServices: [
            { en: 'Half-Day City Driver', fr: 'Chauffeur Demi-journée (Ville)', ar: 'سائق نصف يوم (بالمدينة)' },
            { en: 'Full-Day City Driver', fr: 'Chauffeur Journée Complète (Ville)', ar: 'سائق يوم كامل (بالمدينة)' },
            { en: 'VIP Airport Transfer', fr: 'Transfert Aéroport VIP', ar: 'نقل من/إلى المطار VIP' },
            { en: 'Intercity Trip Driver', fr: 'Trajet Interurbain', ar: 'سائق رحلات بين المدن' }
        ],
        bullets: [
            { en: 'Professional, verified drivers for your personal or business trips.', fr: 'Des chauffeurs professionnels et vérifiés pour vos trajets personnels ou professionnels.', ar: 'سائقون محترفون ومدققون لرحلاتك الشخصية أو العملية.' },
            { en: 'Comfortable rides customized to your schedule and needs.', fr: 'Trajets confortables adaptés à votre emploi du temps et à vos besoins.', ar: 'رحلات مريحة مخصصة لجدولك واحتياجاتك.' },
        ],
        heroImage: '/Images/Job Cards Images/Moving Help_job_card.webp',
    },
    {
        id: 'learn_arabic',
        label: 'Learn Arabic',
        labelFr: 'Apprendre l\'arabe',
        labelAr: 'تعلم العربية',
        iconPath: '/Images/Vectors Illu/LearnArabic.webp',
        subServices: [
            { en: 'Intro to Moroccan Darija', fr: 'Intro à la Darija Marocaine', ar: 'مقدمة في الدارجة المغربية' },
            { en: 'Conversational Practice', fr: 'Pratique Conversationnelle', ar: 'ممارسة المحادثة' },
            { en: 'Arabic Calligraphy Intro', fr: 'Intro à la Calligraphie Arabe', ar: 'مقدمة في الخط العربي' },
            { en: 'Survival Arabic for Tourists', fr: 'Arabe de Survie pour Touristes', ar: 'العربية للسياح' }
        ],
        bullets: [
            { en: 'Learn from local Moroccan native speakers.', fr: 'Apprenez avec des locuteurs natifs marocains.', ar: 'تعلم من متحدثين مغاربة أصليين.' },
            { en: 'Now Trending: Personalized Darija sessions for expats.', fr: 'Tendance actuelle : Sessions de Darija personnalisées pour les expatriés.', ar: 'رائج الآن: جلسات دارجة مخصصة للمغتربين.' },
        ],
        heroImage: '/Images/Job Cards Images/Babysetting_job_card.webp',
    },
];

// ── Props ──────────────────────────────────────────────────────────────────
interface ClientHomeProps {
    userName?: string;
    selectedCity?: string | null;
    selectedArea?: string | null;
    recentOrders?: any[];
    availableServiceIds?: string[];
    availableSubServiceIds?: string[];
    trendingSubServiceIds?: string[]; // array of subService ids
    popularServiceIds?: string[]; // ordered list of service ids by popularity
    onSelectService: (service: string, subService?: string) => void;
    onChangeLocation: () => void;
    onNavigateToShare?: () => void;
    showOnboarding: boolean;
    onOnboardingComplete: () => void;
    onBecomeBricoler?: () => void; // callback to launch the Bricoler onboarding
}

// ── Component ──────────────────────────────────────────────────────────────
const ClientHome: React.FC<ClientHomeProps> = ({
    onSelectService,
    availableServiceIds,
    availableSubServiceIds,
    trendingSubServiceIds = [],
    popularServiceIds = [],
    selectedCity,
    selectedArea,
    recentOrders = [],
    onChangeLocation,
    onNavigateToShare,
    showOnboarding,
    onOnboardingComplete,
    onBecomeBricoler,
}) => {
    const { t, language } = useLanguage();

    const [lastCategoryId, setLastCategoryId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showReferralBanner, setShowReferralBanner] = useState(false);
    const [showBricolerUpsell, setShowBricolerUpsell] = useState(false);

    // Initial load
    useEffect(() => {
        // Onboarding Check
        // Onboarding logic is now handled in page.tsx

        const stored = localStorage.getItem('last_service_category');
        if (stored) setLastCategoryId(stored);

        // Referral Banner Visibility Logic
        const hasOrders = recentOrders && recentOrders.length > 0;
        if (!hasOrders) {
            setShowReferralBanner(false);
            return;
        }

        const lastDismissed = localStorage.getItem('referral_banner_dismissed_at');
        const lastOrderCount = parseInt(localStorage.getItem('referral_last_order_count') || '0');

        const isNewOrder = recentOrders.length > lastOrderCount;
        const isExpired = lastDismissed ? (Date.now() - parseInt(lastDismissed) > 24 * 60 * 60 * 1000) : true;

        if (isNewOrder || isExpired) {
            setShowReferralBanner(true);
            localStorage.setItem('referral_last_order_count', recentOrders.length.toString());
        } else {
            setShowReferralBanner(false);
        }
    }, [recentOrders]);

    // Show bricoler upsell once after client onboarding
    useEffect(() => {
        const alreadyShown = localStorage.getItem('bricoler_upsell_shown');
        if (!alreadyShown) {
            // Small delay so the onboarding modal has fully closed first
            const timer = setTimeout(() => setShowBricolerUpsell(true), 800);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleReferralClick = () => {
        localStorage.setItem('referral_banner_dismissed_at', Date.now().toString());
        localStorage.setItem('referral_last_order_count', (recentOrders?.length || 0).toString());
        setShowReferralBanner(false);
        if (onNavigateToShare) onNavigateToShare();
    };

    const localizePlace = (name: string | null | undefined) => {
        if (!name) return '';
        if (language !== 'ar') return name;
        const key = name.trim();
        const map: Record<string, string> = {
            'Casablanca': 'الدار البيضاء',
            'Marrakech': 'مراكش',
            'Essaouira': 'الصويرة',
            'Agadir': 'أكادير',
            'Tangier': 'طنجة',
            'Rabat': 'الرباط',
            'Fes': 'فاس',
            'Medina': 'المدينة',
            'Médina': 'المدينة',
        };
        return map[key] || key;
    };
    // Supply-driven filtering + optional Trending tab appended
    const visibleServices = React.useMemo(() => {
        let base = availableServiceIds && availableServiceIds.length > 0
            ? SERVICES.filter(s => availableServiceIds.includes(s.id))
            : SERVICES;

        // 1) Popularity-based ordering for this city/month, when provided
        if (popularServiceIds && popularServiceIds.length > 0) {
            const orderMap = new Map<string, number>();
            popularServiceIds.forEach((id, idx) => {
                // lower index = more popular
                orderMap.set(id.toLowerCase(), idx);
            });

            base = [...base].sort((a, b) => {
                const aRank = orderMap.has(a.id.toLowerCase()) ? (orderMap.get(a.id.toLowerCase()) as number) : Number.MAX_SAFE_INTEGER;
                const bRank = orderMap.has(b.id.toLowerCase()) ? (orderMap.get(b.id.toLowerCase()) as number) : Number.MAX_SAFE_INTEGER;
                return aRank - bRank;
            });
        }

        // 2) Personalization: place the last used category first
        if (lastCategoryId) {
            const lastIdx = base.findIndex(s => s.id === lastCategoryId);
            if (lastIdx > 0) {
                const updatedBase = [...base];
                const [lastUsed] = updatedBase.splice(lastIdx, 1);
                updatedBase.unshift(lastUsed);
                base = updatedBase;
            }
        }

        if (trendingSubServiceIds.length > 0) {
            // ... (rest of trending logic remains same)
            const trendingSubs: { en: string; fr: string; ar?: string }[] = [];
            for (const subId of trendingSubServiceIds) {
                SERVICES.forEach(svc => {
                    const svcConfig = require('@/config/services_config').getServiceById(svc.id);
                    if (svcConfig) {
                        const targetSub = svcConfig.subServices.find((ss: any) => ss.id === subId);
                        if (targetSub) {
                            const translatedObj = svc.subServices.find(ts => ts.en === targetSub.name || ts.en.toLowerCase().includes(targetSub.name.toLowerCase()));
                            if (translatedObj) {
                                trendingSubs.push({ en: translatedObj.en, fr: translatedObj.fr, ar: translatedObj.ar });
                            } else {
                                trendingSubs.push({ en: targetSub.name, fr: targetSub.name });
                            }
                        }
                    }
                });
            }

            const uniqueTrending = Array.from(new Map(trendingSubs.map(item => [item.en, item])).values());

            if (uniqueTrending.length > 0) {
                return [
                    ...base,
                    {
                        id: '__trending__',
                        label: 'Trending',
                        labelFr: 'Tendances',
                        labelAr: 'رائج',
                        iconPath: '',
                        subServices: uniqueTrending,
                        bullets: [
                            { en: 'The hottest tasks in your city right now.', fr: 'Les tâches les plus demandées dans votre ville en ce moment.', ar: 'أكثر الخدمات طلباً في مدينتك الآن.' },
                        ],
                        heroImage: '',
                    }
                ];
            }
        }
        return base;
    }, [availableServiceIds, trendingSubServiceIds, lastCategoryId, popularServiceIds]);

    const [activeId, setActiveId] = useState<string>('');
    const [hasManuallySelected, setHasManuallySelected] = useState(false);

    // Filter by search query
    const filteredServices = searchQuery.trim()
        ? visibleServices.filter(svc =>
            svc.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
            svc.labelFr.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (svc.labelAr && svc.labelAr.includes(searchQuery)) ||
            svc.subServices.some(sub =>
                sub.en.toLowerCase().includes(searchQuery.toLowerCase()) ||
                sub.fr.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (sub.ar && sub.ar.includes(searchQuery))
            )
        )
        : visibleServices;

    // Auto-select first filtered result when searching
    useEffect(() => {
        if (searchQuery && filteredServices.length > 0) {
            setActiveId(filteredServices[0].id);
            setHasManuallySelected(false);
        }
    }, [searchQuery]);

    // Resync activeId to the top of the list if user hasn't made a manual choice or current choice vanished
    useEffect(() => {
        if (visibleServices.length > 0) {
            if (!activeId || (!hasManuallySelected && visibleServices[0].id !== activeId) || !visibleServices.find(s => s.id === activeId)) {
                setActiveId(visibleServices[0].id);
            }
        }
    }, [visibleServices, activeId, hasManuallySelected]);
    const active = filteredServices.find(s => s.id === activeId) || filteredServices[0] || visibleServices[0] || SERVICES[0];

    return (
        <div className="min-h-screen bg-white flex flex-col pb-28">

            {/* ── Location selector ───────────────────────────────────── */}
            <div className="flex items-center justify-center pt-10 px-10">
                <button
                    onClick={onChangeLocation}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-neutral-100 bg-neutral-50/50 active:scale-95 transition-all shadow-sm"
                >
                    <MapPin size={14} className="text-[#00A082]" />
                    <span className="text-[13px] font-black text-neutral-800 tracking-tight">
                        {localizePlace(selectedCity)}{selectedArea ? `, ${localizePlace(selectedArea)}` : ''}
                    </span>
                    <ChevronDown size={14} className="text-neutral-400" />
                </button>
            </div>

            {/* ── Hero Heading ─────────────────────────────────────────── */}
            <div className="px-6 pt-10 pb-12 flex flex-col items-center text-center">
                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="font-black leading-[1.05] tracking-tighter text-[#1D1D1D] mx-auto relative overflow-hidden"
                    style={{
                        fontSize: t({ en: 'clamp(42px, 12vw, 56px)', fr: 'clamp(34px, 10vw, 48px)', ar: 'clamp(34px, 10vw, 48px)' }),
                        maxWidth: t({ en: '380px', fr: '420px', ar: '430px' }),
                        fontWeight: 700
                    }}
                >
                    {t({
                        en: 'Book trusted help for home tasks',
                        fr: 'Réservez une aide de confiance pour vos tâches',
                        ar: 'احجز مساعدة موثوقة لمهام منزلك'
                    })}
                    {/* Shine effect overlay */}
                    <motion.div
                        initial={{ left: '-100%' }}
                        animate={{ left: '200%' }}
                        transition={{ duration: 2.5, ease: "easeInOut", delay: 3 }}
                        style={{
                            position: 'absolute',
                            top: 0,
                            bottom: 0,
                            width: '50%',
                            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.7), transparent)',
                            transform: 'skewX(-20deg)',
                            pointerEvents: 'none',
                        }}
                    />
                </motion.h1>

                {/* Referral Banner */}
                <AnimatePresence>
                    {showReferralBanner && (
                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, height: 0, scale: 0.9, marginTop: 0, marginBottom: 0 }}
                            onClick={handleReferralClick}
                            className="mt-8 w-full max-w-[400px] rounded-[5px] p-5 flex items-center justify-between cursor-pointer relative overflow-hidden shadow-sm active:scale-95 transition-transform"
                            style={{ backgroundColor: '#027C3E' }}
                        >
                            <div className="flex-1 text-left pr-2 z-10">
                                <h3 className="text-[25px] font-black text-white leading-tight mb-1.5">
                                    {t({ en: 'Refer friends, win 20 DH', fr: 'Parrainez, gagnez 20 DH', ar: 'أحِل أصدقائك واربح 20 درهم' })}
                                </h3>
                                <p className="text-[13px] font-semibold text-white/90 leading-tight">
                                    {t({
                                        en: 'Invite your friends to Lbricol and win 20dh for each successful referral!',
                                        fr: 'Invitez vos amis sur Lbricol et gagnez 20dh pour chaque parrainage réussi !',
                                        ar: 'قم بدعوة أصدقائك إلى Lbricol واربح 20 درهم عن كل دعوة ناجحة!'
                                    })}
                                </p>
                            </div>
                            <div className="w-24 h-24 flex-shrink-0 z-10 relative -my-4 -mr-2">
                                <img src="/Images/Vectors Illu/gifts.webp" alt="Gifts" className="w-full h-full object-contain" />
                            </div>

                            {/* Decorative background shape */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full blur-2xl select-none pointer-events-none" />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* ── Category tabs ───────────────────────────────────────── */}
            {/* Search bar */}
            <div className="px-4 pt-2 pb-3 w-[80%] mx-auto">
                <div className="flex items-center gap-2 bg-neutral-50 border border-neutral-200 rounded-full px-4 py-3">
                    <Search size={18} className="text-neutral-400 flex-shrink-0" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder={t({ en: 'Search services...', fr: 'Rechercher un service...', ar: 'ابحث عن خدمة...' })}
                        className="flex-1 bg-transparent text-[15px] font-medium text-neutral-800 placeholder:text-neutral-400 outline-none"
                    />
                    {searchQuery.length > 0 && (
                        <button onClick={() => setSearchQuery('')} className="text-neutral-400 hover:text-neutral-600 transition-colors active:scale-90">
                            <X size={16} />
                        </button>
                    )}
                </div>
            </div>

            {/* No results message */}
            {searchQuery && filteredServices.length === 0 && (
                <div className="px-4 py-8 text-center">
                    <p className="text-[15px] font-medium text-neutral-400">
                        {t({ en: 'No services found for', fr: 'Aucun service trouvé pour', ar: 'لا توجد خدمات لـ' })} "<span className="text-neutral-600 font-bold">{searchQuery}</span>"
                    </p>
                </div>
            )}

            <div
                className="flex gap-4 overflow-x-auto border-b border-neutral-100 px-4 flex-shrink-0"
                style={{ scrollbarWidth: 'none' }}
            >
                {filteredServices.map((svc, idx) => {
                    const isActive = svc.id === activeId;
                    const isTrending = svc.id === '__trending__';
                    // Trending uses amber/gold palette; regular tabs use green/yellow
                    const activeColor = isTrending ? '#B8860B' : G_GREEN;
                    const activeBg = isTrending ? '#FFF3CD' : '#FFC244';
                    return (
                        <motion.button
                            key={svc.id}
                            initial={{ opacity: 0, y: 20, scale: 0.8 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{
                                type: "spring",
                                damping: 15,
                                stiffness: 200,
                                delay: idx * 0.08
                            }}
                            onClick={() => {
                                setActiveId(svc.id);
                                setHasManuallySelected(true);
                            }}
                            className="flex flex-col items-center gap-3 px-1 pt-4 pb-3 flex-shrink-0 relative transition-all"
                        >
                            {/* Icon circle */}
                            <motion.div
                                animate={isActive ? {
                                    borderRadius: [
                                        '60% 40% 30% 70% / 60% 30% 70% 40%',
                                        '30% 60% 70% 40% / 50% 60% 30% 60%',
                                        '60% 40% 30% 70% / 60% 30% 70% 40%'
                                    ],
                                    rotate: [-10, 5, -10],
                                    scale: [1.05, 1.08, 1.05]
                                } : {
                                    borderRadius: '50%',
                                    rotate: 0,
                                    scale: 1
                                }}
                                transition={isActive ? {
                                    duration: 6,
                                    repeat: Infinity,
                                    ease: "easeInOut"
                                } : {
                                    duration: 0.3
                                }}
                                style={{
                                    width: 90,
                                    height: 90,
                                    backgroundColor: isActive ? activeBg : '#FFFFFF',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    border: isActive ? 'none' : '1.5px solid #F0F0F0',
                                }}
                            >
                                {isTrending ? (
                                    <span style={{ fontSize: 36 }}>🔥</span>
                                ) : (
                                    <img
                                        src={svc.iconPath}
                                        className="w-14 h-14 object-contain transition-all duration-300"
                                        style={{ filter: 'none' }}
                                        alt={svc.label}
                                    />
                                )}
                            </motion.div>

                            {/* Label */}
                            <span
                                className="text-[14px] whitespace-nowrap mt-1"
                                style={{
                                    fontWeight: isActive ? 900 : 700,
                                    color: isActive ? activeColor : '#666',
                                    letterSpacing: '-0.02em',
                                }}
                            >
                                {t({ en: svc.label, fr: svc.labelFr, ar: svc.labelAr || svc.labelFr })}
                            </span>

                            {/* Active underline */}
                            {isActive && (
                                <motion.div
                                    layoutId="tab-indicator"
                                    className="absolute bottom-0 left-0 right-0 rounded-full"
                                    style={{ height: 3, backgroundColor: activeColor }}
                                    transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                                />
                            )}
                        </motion.button>
                    );
                })}
            </div>

            {/* ── Active service content ──────────────────────────────── */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeId}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col flex-1 pt-5"
                >
                    {/* Sub-service pill chips */}
                    <div className="px-4 pb-6 flex flex-wrap gap-2.5">
                        {active.subServices
                            .filter(subObj => {
                                const subName = subObj.en;
                                if (!availableSubServiceIds || availableSubServiceIds.length === 0) return true;
                                const config = getServiceById(active.id);
                                if (!config) return true;
                                const subConfig = config.subServices.find(ss => ss.name === subName);
                                if (!subConfig) return true; // Keep it if we can't find a mapping (fallback)
                                return availableSubServiceIds.includes(subConfig.id);
                            })
                            .map((sub, idx) => (
                                <motion.button
                                    key={sub.en}
                                    initial={{ opacity: 0, scale: 0.6 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{
                                        type: 'spring',
                                        stiffness: 380,
                                        damping: 20,
                                        delay: idx * 0.07
                                    }}
                                    whileTap={{ scale: 0.92 }}
                                    onClick={() => {
                                        localStorage.setItem('last_service_category', active.id);
                                        onSelectService(active.id, sub.en);
                                    }}
                                    className="px-4 py-2.5 rounded-full border border-[#E6E6E6] text-[15px] font-bold text-[#1D1D1D] bg-white hover:border-[#1D1D1D] active:bg-neutral-50 transition-colors shadow-[0_2px_8px_rgba(0,0,0,0.03)]"
                                >
                                    {t(sub)}
                                </motion.button>
                            ))}
                    </div>

                    {/* Feature bullets */}
                    <div className="px-5 pb-5 space-y-3.5">
                        {active.bullets.map((b, i) => (
                            <motion.div
                                key={i}
                                className="flex items-start gap-3"
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                transition={{
                                    type: 'spring',
                                    stiffness: 260,
                                    damping: 22,
                                    delay: active.subServices.length * 0.07 + i * 0.08
                                }}
                            >
                                <span className="mt-0.5 text-[#B3B3B3] flex-shrink-0 text-[15px]">✓</span>
                                <p className="text-[15px] text-[#4A4A4A] leading-snug font-medium">{t(b)}</p>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            </AnimatePresence>

            {/* Horizontal Auto-scrolling Client Reviews Section */}
            <ReviewsScrollingSection />

            {/* Premium Onboarding Overlay */}
            <AnimatePresence>
                {showOnboarding && (
                    <ClientOnboarding
                        onComplete={() => {
                            onOnboardingComplete();
                            // After onboarding completes, trigger the upsell card if not shown
                            const alreadyShown = localStorage.getItem('bricoler_upsell_shown');
                            if (!alreadyShown) {
                                setTimeout(() => setShowBricolerUpsell(true), 900);
                            }
                        }}
                    />
                )}
            </AnimatePresence>

            {/* ── Bricoler Upsell Card (shown once after first visit/onboarding) ── */}
            <AnimatePresence>
                {showBricolerUpsell && (
                    <motion.div
                        initial={{ y: 120, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 120, opacity: 0 }}
                        transition={{ type: 'spring', damping: 22, stiffness: 220 }}
                        className="fixed bottom-24 left-4 right-4 z-[200]"
                    >
                        <div
                            className="rounded-[24px] p-5 flex items-center gap-4 shadow-2xl relative overflow-hidden cursor-pointer active:scale-[0.98] transition-transform"
                            style={{ backgroundColor: '#027C3E' }}
                            onClick={() => {
                                localStorage.setItem('bricoler_upsell_shown', 'true');
                                setShowBricolerUpsell(false);
                                onBecomeBricoler?.();
                            }}
                        >
                            {/* Icon */}
                            <div className="w-24 h-24 rounded-2xl flex items-center justify-center flex-shrink-0">
                                <img src="/Images/4c456a03818b25032d0e4e80a711d569-Photoroom.png" alt="Bricoler" className="w-50 h-50 object-contain" />
                            </div>

                            {/* Text */}
                            <div className="flex-1">
                                <p className="text-white font-black text-[17px] leading-tight mb-0.5">
                                    {t({ en: 'Earn money with your skills', fr: 'Gagnez de l\'argent avec vos compétences', ar: 'اربح المال بمهاراتك' })}
                                </p>
                                <p className="text-white/80 text-[13px] font-semibold leading-snug">
                                    {t({ en: 'Become a Bricoler — set your own hours', fr: 'Devenez Bricoleur — choisissez vos horaires', ar: 'كن بريكولرًا — اختر ساعاتك' })}
                                </p>
                            </div>

                            {/* Remove button at top right */}
                            <button
                                className="absolute top-3 right-4 w-8 h-8 rounded-full bg-white/20 text-white flex items-center justify-center active:scale-95 transition-transform z-10"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    localStorage.setItem('bricoler_upsell_shown', 'true');
                                    setShowBricolerUpsell(false);
                                }}
                            >
                                <X size={18} strokeWidth={3} />
                            </button>

                            {/* Decorative glow */}
                            <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/10 rounded-full blur-2xl pointer-events-none" />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ClientHome;
