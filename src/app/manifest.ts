import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Agent Finder Pro',
    short_name: 'Agent Finder',
    description: 'Operational CRM workspace for lead intake, outreach, WhatsApp, and AI call workflows.',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    background_color: '#eef3fb',
    theme_color: '#445b84',
    orientation: 'portrait',
    categories: ['business', 'productivity'],
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
