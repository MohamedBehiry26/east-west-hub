import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';
import { PublicLayoutComponent } from './pages/public-layout.component';

const publicLocaleRoutes = (locale: 'en' | 'ar'): Routes => [{
  path: locale,
  component: PublicLayoutComponent,
  children: [
    { path: '', pathMatch: 'full', loadComponent: () => import('./pages/public-home.page').then((m) => m.PublicHomePage) },
    { path: 'watch', data: { kind: 'videos', section: 'watch' }, loadComponent: () => import('./pages/public-utility-pages').then((m) => m.VideoListPage) },
    { path: 'watch/:slug', data: { kind: 'videos', section: 'watch' }, loadComponent: () => import('./pages/content-pages').then((m) => m.ContentDetailPage) },
    { path: 'videos', pathMatch: 'full', redirectTo: 'watch' },
    { path: 'videos/:slug', redirectTo: 'watch/:slug' },
    { path: 'podcasts', data: { kind: 'podcasts', section: 'podcasts' }, loadComponent: () => import('./pages/content-pages').then((m) => m.ContentListPage) },
    { path: 'podcasts/:slug', data: { kind: 'podcasts', section: 'podcasts' }, loadComponent: () => import('./pages/content-pages').then((m) => m.ContentDetailPage) },
    { path: 'categories', data: { kind: 'categories' }, loadComponent: () => import('./pages/content-pages').then((m) => m.ContentListPage) },
    { path: 'categories/:slug', loadComponent: () => import('./pages/public-utility-pages').then((m) => m.CategoryDetailPage) },
    { path: 'search', loadComponent: () => import('./pages/public-utility-pages').then((m) => m.SearchPage) },
    { path: 'services', data: { kind: 'services' }, loadComponent: () => import('./pages/content-pages').then((m) => m.ContentListPage) },
    { path: 'services/:slug', data: { kind: 'services' }, loadComponent: () => import('./pages/content-pages').then((m) => m.ContentDetailPage) },
    { path: 'projects', data: { kind: 'portfolio', section: 'projects' }, loadComponent: () => import('./pages/content-pages').then((m) => m.ContentListPage) },
    { path: 'projects/:slug', data: { kind: 'portfolio', section: 'projects' }, loadComponent: () => import('./pages/content-pages').then((m) => m.ContentDetailPage) },
    { path: 'portfolio', pathMatch: 'full', redirectTo: 'projects' },
    { path: 'portfolio/:slug', redirectTo: 'projects/:slug' },
    { path: 'insights', data: { kind: 'articles', section: 'insights' }, loadComponent: () => import('./pages/content-pages').then((m) => m.ContentListPage) },
    { path: 'insights/:slug', data: { kind: 'articles', section: 'insights' }, loadComponent: () => import('./pages/content-pages').then((m) => m.ContentDetailPage) },
    { path: 'articles', pathMatch: 'full', redirectTo: 'insights' },
    { path: 'articles/:slug', redirectTo: 'insights/:slug' },
    { path: 'about', data: { kind: 'about' }, loadComponent: () => import('./pages/content-pages').then((m) => m.PublicInfoPage) },
    { path: 'contact', data: { kind: 'contact' }, loadComponent: () => import('./pages/content-pages').then((m) => m.PublicInfoPage) }
  ]
}];

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'en' },
  ...publicLocaleRoutes('en'),
  ...publicLocaleRoutes('ar'),
  { path: 'admin/login', loadComponent: () => import('./admin/login.page').then((m) => m.LoginPage) },
  {
    path: 'admin',
    canActivate: [authGuard],
    loadComponent: () => import('./admin/admin-shell.component').then((m) => m.AdminShellComponent),
    children: [
      { path: '', pathMatch: 'full', loadComponent: () => import('./admin/admin-home.page').then((m) => m.AdminHomePage) },
      { path: 'services', loadComponent: () => import('./admin/admin-content.pages').then((m) => m.AdminServicesPage) },
      { path: 'portfolio', loadComponent: () => import('./admin/admin-content.pages').then((m) => m.AdminPortfolioPage) },
      { path: 'articles', loadComponent: () => import('./admin/admin-content.pages').then((m) => m.AdminArticlesPage) },
      { path: 'settings', loadComponent: () => import('./admin/admin-settings.page').then((m) => m.AdminSettingsPage) },
      { path: 'videos', loadComponent: () => import('./admin/admin-video.pages').then((m) => m.AdminVideosPage) },
      { path: 'podcasts', data: { mediaKind: 'podcast' }, loadComponent: () => import('./admin/admin-video.pages').then((m) => m.AdminVideosPage) },
      { path: 'categories', loadComponent: () => import('./admin/admin-video.pages').then((m) => m.AdminCategoriesPage) },
      { path: 'tags', loadComponent: () => import('./admin/admin-tags.page').then((m) => m.AdminTagsPage) },
      { path: 'youtube', loadComponent: () => import('./admin/admin-youtube.page').then((m) => m.AdminYouTubePage) }
    ]
  },
  { path: '**', loadComponent: () => import('./pages/public-utility-pages').then((m) => m.NotFoundPage) }
];
