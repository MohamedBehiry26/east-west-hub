import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RevealDirective } from '../shared/reveal.directive';
import { MediaDepthDirective } from '../shared/media-depth.directive';
import { ImageFallbackDirective } from '../shared/image-fallback.directive';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, forkJoin, of, Subscription } from 'rxjs';
import { PublicContentApi } from '../core/public-content-api.service';
import { PublicArticle, PublicCategory, PublicPortfolioProject, PublicService, PublicSiteSettings, PublicVideo } from '../core/public-content.models';
import { SeoMetadataService } from '../core/seo-metadata.service';
import enResources from '../../assets/i18n/en.json';
import arResources from '../../assets/i18n/ar.json';

import { DomSanitizer } from '@angular/platform-browser';

type Language = 'en' | 'ar';

@Component({
  standalone: true,
  imports: [RouterLink, RevealDirective, MediaDepthDirective, ImageFallbackDirective],
  templateUrl: './public-home.page.html'
})
export class PublicHomePage implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly seo = inject(SeoMetadataService);
  private readonly api = inject(PublicContentApi);
  language: Language = 'en';
  private request?: Subscription;
  readonly featuredVideo = signal<PublicVideo | null>(null);
  readonly featuredPodcast = signal<PublicVideo | null>(null);
  readonly latestVideos = signal<PublicVideo[]>([]);
  readonly categories = signal<PublicCategory[]>([]);
  readonly services = signal<PublicService[]>([]);
  readonly projects = signal<PublicPortfolioProject[]>([]);
  readonly articles = signal<PublicArticle[]>([]);
  readonly siteSettings = signal<PublicSiteSettings | null>(null);
  private readonly sanitizer = inject(DomSanitizer);
  readonly heroStarted = signal(false);
  readonly heroVideoId = computed(() => {
    const id = this.siteSettings()?.heroYouTubeVideoId;
    return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
  });
  readonly heroEmbedUrl = computed(() => {
    const id = this.heroVideoId();
    return id ? this.sanitizer.bypassSecurityTrustResourceUrl(`https://www.youtube-nocookie.com/embed/${id}?autoplay=1`) : null;
  });

  readonly content = { en: enResources.publicHome, ar: arResources.publicHome } as const;

  readonly loading = signal(true);
  readonly failed = signal(false);
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
    this.loading.set(true); this.failed.set(false);
    const emptyPage = <T>() => of({ items: [] as T[], page: 1, pageSize: 6, totalCount: 0 });
    this.request = forkJoin({
      videos: this.api.getVideos(this.language, undefined, { pageSize: 1, order: 'featured' }).pipe(catchError(() => { this.failed.set(true); return emptyPage<PublicVideo>(); })),
      latest: this.api.getVideos(this.language, undefined, { pageSize: 3, order: 'latest' }).pipe(catchError(() => emptyPage<PublicVideo>())),
      podcasts: this.api.getPodcasts(this.language, { pageSize: 3 }).pipe(catchError(() => emptyPage<PublicVideo>())),
      categories: this.api.getCategories(this.language).pipe(catchError(() => of([] as PublicCategory[]))),
      services: this.api.getServices(this.language, 1, 3).pipe(catchError(() => emptyPage<PublicService>())),
      projects: this.api.getPortfolio(this.language, 1, 2).pipe(catchError(() => emptyPage<PublicPortfolioProject>())),
      articles: this.api.getArticles(this.language, 1, 3).pipe(catchError(() => emptyPage<PublicArticle>())),
      settings: this.api.getSiteSettings(this.language).pipe(catchError(() => of(null)))
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(({ videos, latest, podcasts, categories, services, projects, articles, settings }) => {
      this.loading.set(false);
      this.featuredVideo.set(videos.items.find(video => video.isFeatured) ?? videos.items[0] ?? null);
      this.featuredPodcast.set(podcasts.items.find(podcast => podcast.isFeatured) ?? podcasts.items[0] ?? null);
      this.latestVideos.set(latest.items); this.categories.set(categories.slice(0, 4));
      this.services.set(services.items); this.projects.set(projects.items); this.articles.set(articles.items); this.siteSettings.set(settings);
    });
  }
}
