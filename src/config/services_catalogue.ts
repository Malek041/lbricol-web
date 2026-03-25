
export interface ServiceEntry {
    id: string;
    label: string;
    labelFr: string;
    labelAr?: string;
    iconPath: string;
    subServices: { id?: string; en: string; fr: string; ar?: string }[];
    bullets: { en: string; fr: string; ar?: string }[];
    heroImage: string;
}

export const SERVICES_CATALOGUE: ServiceEntry[] = [
    {
        id: 'home_repairs',
        label: 'Home repairs',
        labelFr: 'Bricolage',
        labelAr: 'إصلاحات منزلية',
        iconPath: '/Images/Service Category vectors/HandymanVector.webp',
        subServices: [
            { id: 'general_repairs', en: 'General Repairs', fr: 'Réparations Générales', ar: 'إصلاحات عامة' },
            { id: 'door_lock_repair', en: 'Door & Lock Repair', fr: 'Réparation de Portes et Serrures', ar: 'إصلاح الأبواب والأقفال' },
            { id: 'furniture_fixes', en: 'Furniture Fixes', fr: 'Réparation de Meubles', ar: 'إصلاح الأثاث' },
            { id: 'shelf_mounting', en: 'Shelf Mounting', fr: 'Montage d\'Étagères', ar: 'تركيب الرفوف' },
            { id: 'caulking_grouting', en: 'Caulking & Grouting', fr: 'Calfeutrage et Jointoiement', ar: 'سد الفجوات والجص' },
            { id: 'wall_repair', en: 'Wall Repair', fr: 'Réparation de Murs', ar: 'إصلاح الجدران' },
            { id: 'appliance_install', en: 'Appliance Installation & Repairs', fr: 'Installation et Réparation d\'Appareils', ar: 'تركيب وإصلاح الأجهزة' },
            { id: 'window_blinds_repair', en: 'Window & Blinds Repair', fr: 'Réparation de Fenêtres et Stores', ar: 'إصلاح النوافذ والستائر' },
            { id: 'flooring_tiling', en: 'Flooring & Tiling Help', fr: 'Aide pour le Sol et le Carrelage', ar: 'المساعدة في الأرضيات والبلاط' },
            { id: 'electrical_help', en: 'Electrical Help', fr: 'Aide Électrique', ar: 'مساعدة كهربائية' },
            { id: 'plumbing_help', en: 'Plumbing Help', fr: 'Aide en Plomberie', ar: 'مساعدة في السباكة' },
            { id: 'light_carpentry', en: 'Light Carpentry', fr: 'Menuiserie Légère', ar: 'نجارة خفيفة' }
        ],
        bullets: [
            { en: 'From leaky taps to broken hinges, we fix it all.', fr: 'Des robinets qui fuient aux charnières cassées, nous réparons tout.', ar: 'من الصنابير التي تسرب إلى المفصلات المكسورة، نصلح كل شيء.' },
            { en: 'New Trending: Smart-home gadget installations.', fr: 'Tendance actuelle : Installations de gadgets pour maison intelligente.', ar: 'رائج الآن: تركيب أجهزة المنزل الذكي.' },
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
            { id: 'general_assembly', en: 'General Furniture Assembly', fr: 'Montage de Meubles Général', ar: 'تركيب أثاث عام' },
            { id: 'ikea_assembly', en: 'IKEA / Flat-Pack Assembly', fr: 'Montage IKEA / Kit', ar: 'تركيب أثاث ايكيا / أثاث جاهز' },
            { id: 'crib_assembly', en: 'Crib Assembly', fr: 'Montage de Berceau', ar: 'تركيب سرير أطفال' },
            { id: 'bookshelf_assembly', en: 'Bookshelf Assembly', fr: 'Montage de Bibliothèque', ar: 'تركيب مكتبة كتب' },
            { id: 'desk_assembly', en: 'Desk Assembly', fr: 'Montage de Bureau', ar: 'تركيب مكتب' }
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
            { id: 'tv_mounting', en: 'TV Mounting', fr: 'Montage de TV', ar: 'تركيب التلفزيون' },
            { id: 'install_shelves', en: 'Shelf Installation', fr: 'Installation d\'Étagères', ar: 'تركيب الرفوف' },
            { id: 'curtain_rod', en: 'Curtain Rod Installation', fr: 'Installation de Tringles à Rideaux', ar: 'تركيب قضبان الستائر' },
            { id: 'mirror_hanging', en: 'Mirror Hanging', fr: 'Accrochage de Miroirs', ar: 'تعليق المرايا' },
            { id: 'picture_hanging', en: 'Picture Hanging', fr: 'Accrochage de Tableaux', ar: 'تعليق اللوحات' }
        ],
        bullets: [
            { en: 'Securely mount your TV, shelves, art, mirrors, dressers, and more.', fr: 'Montez en toute sécurité votre TV, vos étagères, vos tableaux, vos miroirs, vos commodes et bien plus.', ar: 'تعليق التلفزيون، الرفوف، اللوحات، المرايا والمزيد بأمان.' },
            { en: 'Now Trending: Gallery walls, art TVs & wraparound bookcases.', fr: 'Tendance actuelle : Murs de galerie, TV artistiques et bibliothèques d\'angle.', ar: 'رائج الآن: جدران المعارض، أجهزة تلفزيون فنية ومكتبات زاوية.' },
        ],
        heroImage: '/Images/Job Cards Images/Handyman_job_card.webp', 
    },
    {
        id: 'moving',
        label: 'Moving',
        labelFr: 'Déménagement',
        labelAr: 'نقل وأثاث',
        iconPath: '/Images/Service Category vectors/MovingHelpVector.webp',
        subServices: [
            { id: 'local_move', en: 'Local Moving', fr: 'Déménagement Local', ar: 'نقل محلي' },
            { id: 'packing', en: 'Packing Services', fr: 'Services d\'Emballage', ar: 'خدمات التغليف' },
            { id: 'furniture_move', en: 'Furniture Moving Only', fr: 'Déménagement de Meubles Uniquement', ar: 'نقل الأثاث فقط' },
            { id: 'heavy_hauling', en: 'Heavy Item Hauling', fr: 'Transport d\'Articles Lourds', ar: 'نقل الأشياء الثقيلة' }
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
            { id: 'family_home', en: 'Family Home Cleaning', fr: 'Nettoyage de Maison Familiale', ar: 'تنظيف منزل عائلي' },
            { id: 'airbnb_cleaning', en: 'Airbnb Cleaning', fr: 'Nettoyage Airbnb', ar: 'تنظيف شقق Airbnb' },
            { id: 'car_washing', en: 'Car Washing', fr: 'Lavage de Voiture', ar: 'غسل السيارات' },
            { id: 'car_detailing', en: 'Car Detailing', fr: 'Nettoyage Détaillé de Voiture', ar: 'تنظيف سيارات دقيق' },
            { id: 'deep_cleaning', en: 'Deep Home Cleaning', fr: 'Nettoyage en Profondeur de Maison', ar: 'تنظيف منزل عميق' }
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
            { id: 'residential_glass', en: 'Residential Glass', fr: 'Vitres Résidentielles', ar: 'زجاج سكني' },
            { id: 'commercial_glass', en: 'Commercial/Office Glass', fr: 'Vitres Commerciales / de Bureau', ar: 'زجاج تجاري / مكاتب' },
            { id: 'automotive_glass', en: 'Automotive Glass', fr: 'Vitres Automobiles', ar: 'زجاج سيارات' },
            { id: 'specialty_glass', en: 'Specialty/Hard-to-Clean Glass', fr: 'Vitres Spéciales / Difficiles à Nettoyer', ar: 'زجاج خاص / صعب التنظيف' }
        ],
        bullets: [
            { en: 'Streak-free cleaning for windows, mirrors and specialty glass.', fr: 'Nettoyage sans traces pour les fenêtres, les miroirs et les vitres spéciales.', ar: 'تنظيف بدون أثر للنوافذ والمرايا والزجاج الخاص.' },
            { en: 'Now Trending: Eco-friendly streak-free formulas.', fr: 'Tendance actuelle : Formules écologiques sans traces.', ar: 'رائج الآن: تركيبات صديقة للبيئة بدون أثر.' },
        ],
        heroImage: '/Images/Job Cards Images/Cleaning_job_card.webp', 
    },
    {
        id: 'gardening',
        label: 'Gardening',
        labelFr: 'Jardinage',
        labelAr: 'بستنة وحدائق',
        iconPath: '/Images/Service Category vectors/GardeningVector.webp',
        subServices: [
            { id: 'lawn_mowing', en: 'Lawn Mowing', fr: 'Tonte de Pelouse', ar: 'قص العشب' },
            { id: 'tree_trimming', en: 'Tree Trimming', fr: 'Taille d\'Arbres', ar: 'تقليم الأشجار' },
            { id: 'planting', en: 'Planting & Landscaping', fr: 'Plantation et Aménagement Paysager', ar: 'زراعة وتنسيق حدائق' },
            { id: 'garden_cleanup', en: 'Garden Cleanup', fr: 'Nettoyage de Jardin', ar: 'تنظيف الحديقة' },
            { id: 'watering_setup', en: 'Watering Setup', fr: 'Installation d\'Arrosage', ar: 'تركيب نظام ري' }
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
            { id: 'leak_repair', en: 'Leak Repair', fr: 'Réparation de Fuites', ar: 'إصلاح التسريبات' },
            { id: 'pipe_install', en: 'Pipe Installation', fr: 'Installation de Tuyaux', ar: 'تركيب الأنابيب' },
            { id: 'drain_cleaning', en: 'Nettoyage de Canalisations', fr: 'Nettoyage de Canalisations', ar: 'تسريح المجاري' },
            { id: 'faucet_repair', en: 'Faucet Repair', fr: 'Réparation de Robinets', ar: 'إصلاح الصنابير' },
            { id: 'toilet_repair', en: 'Toilet Repair', fr: 'Réparation de Toilettes', ar: 'إصلاح المراحيض' }
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
            { id: 'wiring', en: 'Wiring & Rewiring', fr: 'Câblage et Recâblage', ar: 'توصيل وتجديد الأسلاك' },
            { id: 'outlet_install', en: 'Outlet Installation', fr: 'Installation de Prises', ar: 'تركيب المقابس' },
            { id: 'light_install', en: 'Light Fixture Installation', fr: 'Installation de Luminaires', ar: 'تركيب الثريات والمصابيح' },
            { id: 'circuit_repair', en: 'Circuit Breaker Repair', fr: 'Réparation de Disjoncteurs', ar: 'إصلاح قواطع التيار' },
            { id: 'smart_switch', en: 'Smart Switch Setup', fr: 'Installation d\'Interrupteurs Intelligents', ar: 'تركيب مفاتيح ذكية' },
            { id: 'cooling_heating', en: 'Heating/cooling systems', fr: 'Chauffage/Climatisation', ar: 'تبريد وتدفئة' },
            { id: 'ev_charger', en: 'Borne de recharge', fr: 'Borne de recharge', ar: 'شاحن سيارات كهربائية' },
            { id: 'surveillance_cameras', en: 'Camera installation', fr: 'Installation caméras', ar: 'تركيب كاميرات مراقبة' }
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
            { id: 'indoor_painting', en: 'Indoor Painting', fr: 'Peinture Intérieure', ar: 'صباغة داخلية' },
            { id: 'wallpapering', en: 'Wallpapering', fr: 'Pose de Papier Peint', ar: 'تركيب ورق الجدران' },
            { id: 'outdoor_painting', en: 'Outdoor Painting', fr: 'Peinture Extérieure', ar: 'صباغة خارجية' },
            { id: 'concrete_brick_painting', en: 'Concrete & Brick Painting', fr: 'Peinture Béton et Brique', ar: 'صباغة الخرسانة والطوب' },
            { id: 'accent_wall', en: 'Accent Wall Painting', fr: 'Mur Accent', ar: 'صباغة حائط تجميلي' },
            { id: 'wallpaper_removal', en: 'Wallpaper Removal', fr: 'Dépose de Papier Peint', ar: 'إزالة ورق الجدران' }
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
            { id: 'regular_babysitting', en: 'Regular Babysitting', fr: 'Garde Prévue', ar: 'جليسة أطفال عادية' },
            { id: 'after_school_care', en: 'After-School Care', fr: 'Garde Après l\'École', ar: 'رعاية بعد المدرسة' },
            { id: 'night_sitting', en: 'Night Sitting', fr: 'Garde de Nuit', ar: 'رعاية ليلية' },
            { id: 'day_supervision', en: 'Day Out Supervision', fr: 'Surveillance de Journées', ar: 'مرافقة نهارية' }
        ],
        bullets: [
            { en: 'Trusted, background-checked carers for your children.', fr: 'Garde d\'enfants de confiance et vérifiée pour vos enfants.', ar: 'مقدمو رعاية موثوقون ومدققون لأطفالك.' },
            { en: 'Now Trending: Bilingual carers and homework-help sessions.', fr: 'Tendance actuelle : Gardes bilingues et aide aux devoirs.', ar: 'رائج الآن: جليسات ثنائيات اللغة وجلسات مساعدة في الواجبات.' },
        ],
        heroImage: '/Images/Job Cards Images/Babysetting_job_card.webp',
    },
    {
        id: 'pool_cleaning',
        label: 'Pool cleaning',
        labelFr: 'Nettoyage de piscine',
        labelAr: 'تنظيف المسبح',
        iconPath: '/Images/Vectors Illu/Poolcleaning_VI.webp',
        subServices: [
            { id: 'chemical_balancing', en: 'Chemical Balancing', fr: 'Équilibre Chimique', ar: 'توازن كيميائي' },
            { id: 'skimming_vacuuming', en: 'Skimming & Vacuuming', fr: 'Écrémage et Aspiration', ar: 'إزالة الشوائب والشفط' },
            { id: 'filter_cleaning', en: 'Filter Cleaning', fr: 'Nettoyage du Filtre', ar: 'تنظيف الفلتر' },
            { id: 'seasonal_opening', en: 'Opening / Closing', fr: 'Ouverture / Fermeture', ar: 'فتح / إغلاق' },
            { id: 'tile_brushing', en: 'Tile & Wall Brushing', fr: 'Brossage des Parois', ar: 'تنظيف البلاط والجدران' }
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
            { id: 'dog_walking', en: 'Dog Walking', fr: 'Promenade de Chien', ar: 'تمشية الكلاب' },
            { id: 'pet_sitting', en: 'Pet Sitting', fr: 'Garde d\'Animaux', ar: 'رعاية الحيوانات' },
            { id: 'pet_grooming', en: 'Pet Grooming', fr: 'Toilettage d\'Animaux', ar: 'تنظيف وتجميل الحيوانات' },
            { id: 'pet_feeding', en: 'Feeding & Check-ins', fr: 'Alimentation et Visites', ar: 'إطعام وزيارات متابعة' },
            { id: 'pet_transport', en: 'Pet Transportation', fr: 'Transport d\'Animaux', ar: 'نقل الحيوانات' }
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
            { id: 'grocery_shopping', en: 'Grocery Shopping', fr: 'Courses Alimentaires', ar: 'تسوق مواد غذائية' },
            { id: 'pharmacy_pickup', en: 'Pharmacy Pickup', fr: 'Pharmacie', ar: 'اقتناء أدوية من الصيدلية' },
            { id: 'general_delivery', en: 'General Pickup & Drop-off', fr: 'Récupération et Dépôt', ar: 'توصيل واستلام عام' },
            { id: 'post_office', en: 'Post Office / Mailing', fr: 'Poste / Courrier', ar: 'البريد / الطرود' },
            { id: 'returns', en: 'In-store Returns', fr: 'Retours en Magasin', ar: 'إرجاع السلع للمتاجر' }
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
            { id: 'companionship', en: 'Companionship & Visits', fr: 'Compagnie et Visites', ar: 'مرافقة وزيارات' },
            { id: 'personal_assistance', en: 'Personal Assistance', fr: 'Aide Personnelle', ar: 'مساعدة شخصية' },
            { id: 'medication_reminders', en: 'Medication Reminders', fr: 'Rappels de Médicaments', ar: 'تذكير بالمواعيد الطبية' },
            { id: 'meal_preparation', en: 'Meal Preparation', fr: 'Préparation des Repas', ar: 'تحضير الوجبات' },
            { id: 'light_housekeeping', en: 'Light Housekeeping', fr: 'Ménage Léger', ar: 'تنظيف خفيف' },
            { id: 'transportation_errands', en: 'Transportation & Errands', fr: 'Transport et Courses', ar: 'نقل وقضاء أغراض' }
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
            { id: 'breakfast', en: 'Breakfast', fr: 'Petit-déjeuner', ar: 'فطور' },
            { id: 'lunch', en: 'Lunch', fr: 'Déjeuner', ar: 'غداء' },
            { id: 'dinner', en: 'Dinner', fr: 'Dîner', ar: 'عشاء' },
            { id: 'moroccan_cooking', en: 'Moroccan Cooking Class', fr: 'Cours de Cuisine Marocaine', ar: 'درس طبخ مغربي' },
            { id: 'private_chef', en: 'Private Chef at Home', fr: 'Chef Privé à Domicile', ar: 'شيف خاص في المنزل' },
            { id: 'market_tour_cooking', en: 'Market Tour & Cooking', fr: 'Circuit Marché & Cuisine', ar: 'جولة السوق وطبخ' }
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
        iconPath: '/Images/Vectors Illu/tourGuide.png',
        subServices: [
            { id: 'city_tour', en: 'City Tour', fr: 'Tour de la Ville', ar: 'جولة في المدينة' },
            { id: 'historical_tour', en: 'Historical Sites Tour', fr: 'Visite des Sites Historiques', ar: 'جولة المواقع التاريخية' },
            { id: 'food_tour', en: 'Moroccan Food Tour', fr: 'Circuit Gastronomique Marocain', ar: 'جولة تذوق الطعام المغربي' },
            { id: 'medina_shopping', en: 'Medina Shopping Guide', fr: 'Guide Shopping Médina', ar: 'دليل تسوق المدينة' }
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
        iconPath: '/Images/Vectors Illu/privateDriver.png',
        subServices: [
            { id: 'half_day_driver', en: 'Half-Day City Driver', fr: 'Chauffeur Demi-journée (Ville)', ar: 'سائق نصف يوم (بالمدينة)' },
            { id: 'full_day_driver', en: 'Full-Day City Driver', fr: 'Chauffeur Journée Complète (Ville)', ar: 'سائق يوم كامل (بالمدينة)' },
            { id: 'vip_airport', en: 'VIP Airport Transfer', fr: 'Transfert Aéroport VIP', ar: 'نقل من/إلى المطار VIP' },
            { id: 'intercity_trip', en: 'Intercity Trip Driver', fr: 'Trajet Interurbain', ar: 'سائق رحلات بين المدن' }
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
            { id: 'darija_intro', en: 'Intro to Moroccan Darija', fr: 'Intro à la Darija Marocaine', ar: 'مقدمة في الدارجة المغربية' },
            { id: 'conversational_arabic', en: 'Conversational Practice', fr: 'Pratique Conversationnelle', ar: 'ممارسة المحادثة' },
            { id: 'arabic_calligraphy', en: 'Arabic Calligraphy Intro', fr: 'Intro à la Calligraphie Arabe', ar: 'مقدمة في الخط العربي' },
            { id: 'survival_arabic', en: 'Survival Arabic for Tourists', fr: 'Arabe de Survie pour Touristes', ar: 'العربية للسياح' }
        ],
        bullets: [
            { en: 'Learn from local Moroccan native speakers.', fr: 'Apprenez avec des locuteurs natifs marocains.', ar: 'تعلم من متحدثين مغاربة أصليين.' },
            { en: 'Now Trending: Personalized Darija sessions for expats.', fr: 'Tendance actuelle : Sessions de Darija personnalisées pour les expatriés.', ar: 'رائج الآن: جلسات دارجة مخصصة للمغتربين.' },
        ],
        heroImage: '/Images/Job Cards Images/Babysetting_job_card.webp',
    },
    {
        id: 'car_rental',
        label: 'Car Rental',
        labelFr: 'Location de Voiture',
        labelAr: 'كراء السيارات',
        iconPath: '/Images/Vectors Illu/carKey.png',
        subServices: [
            { id: 'rent_a_car', en: 'Rent a Car', fr: 'Louer une Voiture', ar: 'كراء سيارة' }
        ],
        bullets: [
            { en: 'Rent a car from verified local owners.', fr: 'Louez une voiture auprès de propriétaires locaux vérifiés.', ar: 'اكتري سيارة من ملاك محليين موثوقين.' },
            { en: 'Now Trending: SUV and Compact cars for city trips.', fr: 'Tendance actuelle : SUV et voitures compactes pour les trajets en ville.', ar: 'رائج الآن: سيارات الدفع الرباعي والسيارات الصغيرة للرحلات الحضرية.' },
        ],
        heroImage: '/Images/Cars.png',
    },
];
