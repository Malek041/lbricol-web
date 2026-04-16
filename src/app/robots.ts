import { MetadataRoute } from 'next';

export const dynamic = 'force-static';
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/admin/*'], // Keep admin routes out of search engines
    },
    sitemap: 'https://lbricol.com/sitemap.xml',
  };
}
