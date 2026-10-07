import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, filter, of } from 'rxjs';
import { PublicContentApi } from '../core/public-content-api.service';
import { PublicSiteSettings } from '../core/public-content.models';
import { Component, DestroyRef, ElementRef, HostListener, OnInit, ViewChild, inject, signal } from '@angular/core';
import { NavigationEnd, NavigationStart, Router, RouterLink, RouterLinkActive, RouterOutlet, ActivatedRoute } from '@angular/router';
import { AlternateRouteService } from '../core/alternate-route.service';
import enResources from '../../assets/i18n/en.json';
import arResources from '../../assets/i18n/ar.json';

type Locale = 'en' | 'ar';

@Component({
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './public-layout.component.html'
})
export class PublicLayoutComponent implements OnInit {
  private readonly routeInfo = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly alternateRoute = inject(AlternateRouteService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly api = inject(PublicContentApi);
  @ViewChild('menuButton') private menuButton?: ElementRef<HTMLButtonElement>;
  readonly settings = signal<PublicSiteSettings | null>(null);
  readonly scrolled = signal(false);
  readonly isHome = signal(true);
  readonly year = new Date().getFullYear();
  get design() { return (this.locale === 'ar' ? arResources : enResources).publicDesign; }
  @HostListener('window:scroll') onScroll(): void { this.scrolled.set(window.scrollY > 24); }
  locale: Locale = 'en';
  readonly menuOpen = signal(false);

  private readonly labels = { en: enResources.publicNavigation, ar: arResources.publicNavigation } as const;

  get copy() { return this.labels[this.locale]; }
  get alternateLocale(): Locale { return this.locale === 'en' ? 'ar' : 'en'; }
  get alternateUrl(): string {
    const override = this.alternateRoute.url();
    if (override) return override;
    const current = this.router.url.split(/[?#]/, 1)[0];
    return current.replace(/^\/(en|ar)(?=\/|$)/, `/${this.alternateLocale}`);
  }
  get navItems() { return [
    { path: '', label: this.copy.home }, { path: 'watch', label: this.copy.watch },
    { path: 'podcasts', label: this.copy.podcasts }, { path: 'services', label: this.copy.services },
    { path: 'projects', label: this.copy.projects }, { path: 'insights', label: this.copy.insights },
    { path: 'about', label: this.copy.about }, { path: 'contact', label: this.copy.contact }
  ]; }

  ngOnInit(): void {
    this.locale = this.routeInfo.snapshot.routeConfig?.path === 'ar' ? 'ar' : 'en';
    document.documentElement.lang = this.locale;
    document.documentElement.dir = this.locale === 'ar' ? 'rtl' : 'ltr';
    this.alternateRoute.set(null);
    this.isHome.set(/^\/(en|ar)\/?$/.test(this.router.url.split(/[?#]/)[0]));
    this.onScroll();
    this.api.getSiteSettings(this.locale).pipe(catchError(() => of(null)), takeUntilDestroyed(this.destroyRef)).subscribe(settings => this.settings.set(settings));
    this.router.events.pipe(filter(event => event instanceof NavigationStart), takeUntilDestroyed(this.destroyRef)).subscribe(() => this.alternateRoute.set(null));
    this.router.events.pipe(filter(event => event instanceof NavigationEnd), takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.closeMenu();
      this.isHome.set(/^\/(en|ar)\/?$/.test(this.router.url.split(/[?#]/)[0]));
    });
  }

  route(path: string): string { return `/${this.locale}/${path}`; }
  skipToContent(event: Event): void {
    event.preventDefault();
    const main = document.getElementById('public-main');
    main?.focus({ preventScroll: true });
    main?.scrollIntoView({ block: 'start' });
  }
  toggleMenu(): void { this.menuOpen.update(open => !open); }
  closeMenu(restoreFocus = false): void { this.menuOpen.set(false); if (restoreFocus) this.menuButton?.nativeElement.focus(); }
}
