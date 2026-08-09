import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://labbuddies.hariommodi.online';
  const routes = [
    { path: '', priority: 1.0, changeFrequency: 'daily' as const },
    { path: '/features', priority: 0.9, changeFrequency: 'weekly' as const },
    { path: '/how-it-works', priority: 0.9, changeFrequency: 'weekly' as const },
    { path: '/create', priority: 0.9, changeFrequency: 'daily' as const },
    { path: '/join', priority: 0.9, changeFrequency: 'daily' as const },
    { path: '/about', priority: 0.8, changeFrequency: 'weekly' as const },
    { path: '/login', priority: 0.7, changeFrequency: 'monthly' as const },
    { path: '/signup', priority: 0.7, changeFrequency: 'monthly' as const },
    { path: '/privacy', priority: 0.5, changeFrequency: 'monthly' as const },
    { path: '/terms', priority: 0.5, changeFrequency: 'monthly' as const },
  ];

  return routes.map((route) => ({
    url: `${baseUrl}${route.path}`,
    lastModified: new Date(),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
