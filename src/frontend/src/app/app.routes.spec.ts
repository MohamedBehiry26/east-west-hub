import { authGuard } from './core/auth.guard';
import { routes } from './app.routes';

describe('application routes', () => {
  it('provides English and Arabic public routes for primary content', () => {
    for (const locale of ['en', 'ar']) {
      const parent = routes.find((route) => route.path === locale);
      const paths = parent?.children?.map((route) => route.path);
      expect(paths).toEqual(expect.arrayContaining([
        '', 'watch', 'watch/:slug', 'podcasts', 'podcasts/:slug', 'categories/:slug', 'search',
        'services/:slug', 'projects', 'projects/:slug', 'insights', 'insights/:slug', 'about', 'contact'
      ]));
    }
  });

  it('guards the admin dashboard while leaving login reachable', () => {
    const admin = routes.find((route) => route.path === 'admin');
    expect(admin?.canActivate).toContain(authGuard);
    expect(routes.some((route) => route.path === 'admin/login')).toBe(true);
    expect(admin?.children?.map((route) => route.path)).toEqual(expect.arrayContaining([
      '', 'videos', 'podcasts', 'categories', 'tags', 'services', 'portfolio', 'articles', 'settings', 'accounts'
    ]));
  });
});

