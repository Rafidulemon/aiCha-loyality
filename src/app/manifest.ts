import type { MetadataRoute } from 'next';

/**
 * Lets the customer app be added to the Home Screen (on an iPhone that is what makes push notifications possible) and opened
 * like an app, straight on the card.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'AiCha Loyalty',
    short_name: 'AiCha',
    description: 'A stamp every visit, a reward every card.',
    start_url: '/cards',
    scope: '/',
    display: 'standalone',
    background_color: '#FFFFFF',
    theme_color: '#E6012C',
    icons: [
      { src: '/brand/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/brand/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
