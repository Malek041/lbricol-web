import { MetadataRoute } from 'next';
import { SERVICES_HIERARCHY } from '@/config/services_config';

export const dynamic = 'force-static';

const MOROCCAN_CITIES = [
    'casablanca', 'marrakech', 'rabat', 'agadir',
    'essaouira', 'tanger', 'fes', 'meknes'
];

export default function sitemap(): MetadataRoute.Sitemap {
    const baseUrl = 'https://lbricol.com';

    // Core static routes
    const coreRoutes = [
        { path: '', priority: 1.0, freq: 'daily' },
        { path: '/join', priority: 0.8, freq: 'monthly' },
        { path: '/privacy', priority: 0.3, freq: 'yearly' },
    ].map(({ path, priority, freq }) => ({
        url: `${baseUrl}${path}`,
        lastModified: new Date(),
        changeFrequency: freq as MetadataRoute.Sitemap[0]['changeFrequency'],
        priority,
    }));

    // Programmatic SEO: Service landing pages at /services/[id]
    // These get real SSR pages with targeted content per service
    const serviceRoutes = Object.values(SERVICES_HIERARCHY).map(service => ({
        url: `${baseUrl}/services/${service.id}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.9,
    }));

    // Programmatic SEO: City + Service combination pages
    // e.g. /services/cleaning/marrakech — highest local-intent traffic
    const cityServiceRoutes = Object.values(SERVICES_HIERARCHY).flatMap(service =>
        MOROCCAN_CITIES.map(city => ({
            url: `${baseUrl}/services/${service.id}/${city}`,
            lastModified: new Date(),
            changeFrequency: 'weekly' as const,
            priority: 0.85,
        }))
    );

    return [...coreRoutes, ...serviceRoutes, ...cityServiceRoutes];
}
