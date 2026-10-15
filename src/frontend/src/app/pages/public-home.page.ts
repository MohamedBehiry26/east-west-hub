import { localHeroPreview } from './local-hero-preview';
import { NgTemplateOutlet } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RevealDirective } from '../shared/reveal.directive';
import { CinematicHeroComponent } from './cinematic-hero.component';
import { ImageFallbackDirective } from '../shared/image-fallback.directive';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, finalize, forkJoin, Observable, of, Subscription } from 'rxjs';
import { PublicContentApi } from '../core/public-content-api.service';
import { PublicArticle, PublicCategory, PublicPage, PublicPortfolioProject, PublicService, PublicSiteSettings, PublicVideo } from '../core/public-content.models';
import { SeoMetadataService } from '../core/seo-metadata.service';
import enResources from '../../assets/i18n/en.json';
import arResources from '../../assets/i18n/ar.json';

type Language = 'en' | 'ar';
type SecondarySection = 'latest' | 'podcasts' | 'categories' | 'services' | 'projects' | 'articles';
type HomeItem = PublicVideo | PublicService | PublicPortfolioProject | PublicArticle;
type SectionResult = PublicPage<HomeItem> | PublicCategory[];

@Component({
  standalone: true,
  imports: [NgTemplateOutlet, RouterLink, RevealDirective, CinematicHeroComponent, ImageFallbackDirective],
  templateUrl: './public-home.page.html'
})
export class PublicHomePage implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly seo = inject(SeoMetadataService);
  private readonly api = inject(PublicContentApi);
  language: Language = 'en';
  private request?: Subscription;
  private settingsRequest?: Subscription;
  readonly featuredVideo = signal<PublicVideo | null>(null);
  readonly featuredPodcast = signal<PublicVideo | null>(null);
  readonly latestVideos = signal<PublicVideo[]>([]);
  readonly categories = signal<PublicCategory[]>([]);
  readonly services = signal<PublicService[]>([]);
  readonly projects = signal<PublicPortfolioProject[]>([]);
  readonly articles = signal<PublicArticle[]>([]);
  readonly siteSettings = signal<PublicSiteSettings | null>(null);
  readonly heroPreview = localHeroPreview();
  readonly content = { en: enResources.publicHome, ar: arResources.publicHome } as const;

  readonly loading = signal(true);
  readonly failed = signal(false);
  readonly sectionErrors = signal<Partial<Record<SecondarySection, boolean>>>({});
  readonly sectionLoading = signal<Partial<Record<SecondarySection, boolean>>>({});
  private readonly sectionRequests: Partial<Record<SecondarySection, Subscription>> = {};
  sectionFailed(section: SecondarySection): boolean { return !!this.sectionErrors()[section]; }
  sectionPending(section: SecondarySection): boolean { return !!this.sectionLoading()[section]; }
  private secondary<T>(section: SecondarySection, source: Observable<T>): Observable<T | null> {
    return source.pipe(catchError(() => { this.sectionErrors.update(state => ({ ...state, [section]: true })); return of(null); }));
  }
  retrySection(section: SecondarySection): void {
    if (this.loading() || this.sectionLoading()[section]) return;
    this.sectionLoading.update(state => ({ ...state, [section]: true }));
    const source: Observable<SectionResult> = section === 'latest' ? this.api.getVideos(this.language, undefined, { pageSize: 3, order: 'latest' })
      : section === 'podcasts' ? this.api.getPodcasts(this.language, { pageSize: 3 })
      : section === 'categories' ? this.api.getCategories(this.language)
      : section === 'services' ? this.api.getServices(this.language, 1, 3)
      : section === 'projects' ? this.api.getPortfolio(this.language, 1, 2)
      : this.api.getArticles(this.language, 1, 3);
    this.sectionRequests[section] = this.secondary(section, source).pipe(takeUntilDestroyed(this.destroyRef), finalize(() => {
      this.sectionLoading.update(state => ({ ...state, [section]: false }));
    })).subscribe(result => {
      if (result === null) return;
      this.sectionErrors.update(state => ({ ...state, [section]: false }));
      if (section === 'categories') this.categories.set((result as PublicCategory[]).slice(0, 4));
      else {
        const items = (result as PublicPage<HomeItem>).items;
        if (section === 'latest') this.latestVideos.set(items as PublicVideo[]);
        if (section === 'podcasts') this.featuredPodcast.set((items as PublicVideo[]).find(item => item.isFeatured) ?? (items[0] as PublicVideo | undefined) ?? null);
        if (section === 'services') this.services.set(items as PublicService[]);
        if (section === 'projects') this.projects.set(items as PublicPortfolioProject[]);
        if (section === 'articles') this.articles.set(items as PublicArticle[]);
      }
    });
  }
  sectionTitle(section: SecondarySection): string {
    return section === 'latest' ? this.copy.latestTitle : section === 'podcasts' ? this.design.podcastStatement
      : section === 'categories' ? this.copy.discoverTitle : section === 'services' ? this.copy.servicesTitle
      : section === 'projects' ? this.copy.workTitle : this.copy.journalTitle;
  }
  readonly waveform = [18,32,60,44,80,95,50,70,35,90,100,62,40,74,28,56,88,45,65,32,18,46,78,55,35,70,92,40,25,15];
  get design() { return (this.language === 'ar' ? arResources : enResources).publicDesign; }
  formatNumber(value: number): string { return new Intl.NumberFormat(this.language, { minimumIntegerDigits: 2 }).format(value); }
  formatDate(value: string): string { return new Intl.DateTimeFormat(this.language === 'ar' ? 'ar-EG' : 'en-US', { dateStyle: 'medium' }).format(new Date(value)); }

  get copy() { return this.content[this.language]; }


  ngOnInit(): void {
    this.language = this.route.parent?.snapshot.routeConfig?.path === 'ar' ? 'ar' : 'en';
    document.documentElement.lang = this.language;
    document.documentElement.dir = this.language === 'ar' ? 'rtl' : 'ltr';
    this.seo.update(this.language, `/${this.language}`, this.design.metaTitle, this.design.metaDescription);
    this.load();
  }

  load(): void {
    this.request?.unsubscribe();
    Object.values(this.sectionRequests).forEach(request => request?.unsubscribe());
    this.sectionLoading.set({});
    this.settingsRequest?.unsubscribe();
    // Start Hero media as soon as settings arrive, independently of the content grids.
    this.settingsRequest=this.api.getSiteSettings(this.language).pipe(catchError(()=>of(null)),takeUntilDestroyed(this.destroyRef)).subscribe(settings=>this.siteSettings.set(settings));
    this.loading.set(true); this.failed.set(false);
    this.sectionErrors.set({});
    const emptyPage = <T>() => of({ items: [] as T[], page: 1, pageSize: 6, totalCount: 0 });
    this.request = forkJoin({
      videos: this.api.getVideos(this.language, undefined, { pageSize: 1, order: 'featured' }).pipe(catchError(() => { this.failed.set(true); return emptyPage<PublicVideo>(); })),
      latest: this.secondary('latest', this.api.getVideos(this.language, undefined, { pageSize: 3, order: 'latest' })),
      podcasts: this.secondary('podcasts', this.api.getPodcasts(this.language, { pageSize: 3 })),
      categories: this.secondary('categories', this.api.getCategories(this.language)),
      services: this.secondary('services', this.api.getServices(this.language, 1, 3)),
      projects: this.secondary('projects', this.api.getPortfolio(this.language, 1, 2)),
      articles: this.secondary('articles', this.api.getArticles(this.language, 1, 3))
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(({ videos, latest, podcasts, categories, services, projects, articles }) => {
      this.loading.set(false);
      this.featuredVideo.set(videos.items.find(video => video.isFeatured) ?? videos.items[0] ?? null);
      if (podcasts) this.featuredPodcast.set(podcasts.items.find(podcast => podcast.isFeatured) ?? podcasts.items[0] ?? null);
      if (latest) this.latestVideos.set(latest.items); if (categories) this.categories.set(categories.slice(0, 4));
      if (services) this.services.set(services.items); if (projects) this.projects.set(projects.items); if (articles) this.articles.set(articles.items);
    });
  }
}
