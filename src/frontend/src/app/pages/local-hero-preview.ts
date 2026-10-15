import { isDevMode } from '@angular/core';

/** Default development loopback preview; never overrides real settings in production. */
export function localHeroPreview(development = isDevMode(), location: Pick<Location, 'hostname' | 'search'> = window.location) {
  if (!development || !['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)) return null;
  return {
    desktopVideo: '/local-hero-preview/east-west-hub-hero-web.mp4',
    mobileVideo: '/local-hero-preview/east-west-hub-hero-mobile.mp4',
    desktopPoster: '/local-hero-preview/east-west-hub-hero-poster.webp',
    mobilePoster: '/local-hero-preview/east-west-hub-hero-mobile-poster.webp'
  };
}
