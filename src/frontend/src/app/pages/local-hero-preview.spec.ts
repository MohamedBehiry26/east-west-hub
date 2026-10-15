import { localHeroPreview } from './local-hero-preview';
it('enables local development Hero without a query while excluding production and remote hosts', () => {
  for (const hostname of ['localhost', '127.0.0.1', '[::1]']) {
    for (const search of ['', '?heroPreview=1']) {
      const location = { hostname, search };
      expect(localHeroPreview(true, location)?.mobileVideo).toBe('/local-hero-preview/east-west-hub-hero-mobile.mp4');
      expect(localHeroPreview(true, location)?.desktopVideo).toBe('/local-hero-preview/east-west-hub-hero-web.mp4');
      expect(localHeroPreview(false, location)).toBeNull();
    }
  }
  expect(localHeroPreview(true, { hostname: 'east-west-hub-staging.pages.dev', search: '' })).toBeNull();
  expect(localHeroPreview(true, { hostname: 'example.com', search: '?heroPreview=1' })).toBeNull();
});
