import { MetadataRoute } from 'next';
import { SERVICES_HIERARCHY } from '@/config/services_config';

export const dynamic = 'force-static';
export default function sitemap(): MetadataRoute.Sitemap {
    const baseUrl = 'https://lbricol.ma';

    // Core static routes
    const coreRoutes = [
        '',
        '/join/bricoler',
        '/join/client',
        '/privacy'
    ].map((route) => ({
        url: `${baseUrl}${route}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: route === '' ? 1 : 0.8,
    }));

    // Dynamic service routes based on configuration
    const serviceRoutes = Object.values(SERVICES_HIERARCHY).map(service => ({
         url: `${baseUrl}/order/${service.id}`,
         lastModified: new Date(),
         changeFrequency: 'weekly' as const,
         priority: 0.9,
    }));

    return [...coreRoutes, ...serviceRoutes];
}
