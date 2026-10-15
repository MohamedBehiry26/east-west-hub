import { Component, DestroyRef, ElementRef, computed, inject, input } from '@angular/core';
import { Router, RouterLink, Scroll } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PublicSiteSettings } from '../core/public-content.models';

// About-only editorial copy stays in the lazy page bundle, not the global locale resources.
const copy = {
  en: {
    kicker: 'Inside East West Hub', title: 'A hub for media and creative work.',
    intro: 'We give ideas a visual language.',
    visual: 'A creative perspective', visualCaption: 'From an idea to the screen.',
    storyKicker: 'Who we are', storyTitle: 'Powerful images.\nA clear purpose.',
    story: 'East West Hub brings content development, production, video, podcasts, campaigns, media relations, events, and digital platform support together.',
    approach: 'Every creative choice starts with the message and the people it needs to reach.',
    processKicker: 'Our creative process', processTitle: 'From the first idea to the final frame.',
    steps: [
      { title: 'Idea Development', body: 'Define the message, audience and creative direction.' },
      { title: 'Storytelling', body: 'Shape the idea into a clear narrative and visual language.' },
      { title: 'Production & Editing', body: 'Bring the story to the screen through filming and editing.' },
      { title: 'Publishing & Distribution', body: 'Prepare the content for the platforms and audience it is intended for.' }
    ],
    ctaKicker: 'Your next story', ctaTitle: 'Let’s explore your idea.',
    ctaBody: 'Tell us what you want to create, who it is for, and what you want it to say.', cta: 'Discuss a project'
  },
  ar: {
    kicker: 'داخل إيست ويست هب', title: 'مساحة للإعلام والعمل الإبداعي.',
    intro: 'نمنح الأفكار لغة بصرية.',
    visual: 'رؤية إبداعية', visualCaption: 'من الفكرة إلى الشاشة.',
    storyKicker: 'من نحن', storyTitle: 'صورة مؤثرة.\nرسالة واضحة.',
    story: 'تجمع إيست ويست هب بين تطوير المحتوى والإنتاج والفيديو والبودكاست والحملات والعلاقات الإعلامية والفعاليات ودعم المنصات الرقمية.',
    approach: 'تنطلق الخيارات الإبداعية من الرسالة ومن الجمهور الذي نريد الوصول إليه.',
    processKicker: 'مسارنا الإبداعي', processTitle: 'من الفكرة الأولى إلى المشهد الأخير.',
    steps: [
      { title: 'تطوير الفكرة', body: 'تحديد الرسالة والجمهور والتوجه الإبداعي.' },
      { title: 'صياغة القصة', body: 'تحويل الفكرة إلى سرد واضح ولغة بصرية متماسكة.' },
      { title: 'الإنتاج والمونتاج', body: 'ترجمة القصة إلى مشاهد من خلال التصوير والمونتاج.' },
      { title: 'النشر والتوزيع', body: 'تهيئة المحتوى للمنصات والجمهور المقصود.' }
    ],
    ctaKicker: 'قصتك القادمة', ctaTitle: 'لنستكشف فكرتك معًا.',
    ctaBody: 'حدّثنا عما تريد إنتاجه، ولمن تقدّمه، والرسالة التي تريد إيصالها.', cta: 'لنتحدث عن مشروعك'
  }
} as const;

@Component({ selector: 'ew-about-experience', standalone: true, imports: [RouterLink],
  templateUrl: './about-experience.component.html', styleUrl: './about-experience.css' })
export class AboutExperienceComponent {
  readonly locale = input<'en'|'ar'>('en');
  readonly settings = input<PublicSiteSettings | null>(null);
  readonly copy = computed(() => copy[this.locale()]);
  readonly story = computed(() => this.settings()?.agencyDescription?.trim() || this.copy().story);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  constructor() {
    // Angular anchor scrolling uses scrollTo coordinates, bypassing CSS scroll-margin.
    // Correct only this page's anchors after the router's normal scroll handling.
    inject(Router).events.pipe(takeUntilDestroyed(inject(DestroyRef))).subscribe(event => {
      if (event instanceof Scroll && ['about-title','about-story','about-process'].includes(event.anchor || '')) {
        const target = this.host.nativeElement.querySelector<HTMLElement>(`#${event.anchor}`);
        queueMicrotask(() => { if (target?.isConnected) target.scrollIntoView({ block: 'start', behavior: 'instant' }); });
      }
    });
  }
  number(index: number): string { return new Intl.NumberFormat(this.locale(), { minimumIntegerDigits: 2 }).format(index + 1); }
}
