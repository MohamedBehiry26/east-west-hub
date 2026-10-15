import { Component, DestroyRef, ElementRef, computed, effect, inject, input, signal, untracked, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';

const copy = {
  en: { headline: 'We Turn Ideas Into Stories Worth Watching.', description: 'Creative media production that combines powerful visuals with meaningful storytelling, from concept to execution.', work: 'Explore Our Work', services: 'Our Services', pause: 'Pause background video', play: 'Play background video', showreel: 'Watch showreel', scroll: 'Discover East West Hub', unavailable: 'Video unavailable — showing the cover image.' },
  ar: { headline: 'نحوّل الأفكار إلى قصص تستحق المشاهدة.', description: 'إنتاج إعلامي وإبداعي يجمع بين قوة الصورة ووضوح الرسالة، من الفكرة إلى التنفيذ.', work: 'استكشف أعمالنا', services: 'تعرّف على خدماتنا', pause: 'إيقاف فيديو الخلفية', play: 'تشغيل فيديو الخلفية', showreel: 'شاهد أعمالنا بالفيديو', scroll: 'اكتشف إيست ويست هب', unavailable: 'تعذر تشغيل الفيديو — تظهر الصورة البديلة.' }
};

function mediaUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  const url=value.trim();
  if (url.startsWith('/') && !url.startsWith('//') && !url.includes('\\')) return url;
  try { const parsed=new URL(url); return parsed.protocol==='https:' && !parsed.username && !parsed.password ? url : null; } catch {return null;}
}

@Component({
  selector: 'ew-cinematic-hero', standalone: true, imports: [RouterLink],
  templateUrl: './cinematic-hero.component.html', styleUrl: './cinematic-hero.css'
})
export class CinematicHeroComponent {
  readonly language=input<'ar'|'en'>('en');
  readonly mp4Url=input<string|null|undefined>(null);
  readonly mobileMp4Url=input<string|null|undefined>(null);
  readonly mobilePosterUrl=input<string|null|undefined>(null);
  readonly mobileViewport=signal(false);
  readonly posterUrl=input<string|null|undefined>(null);
  readonly youTubeId=input<string|null|undefined>(null);
  readonly labels=computed(()=>copy[this.language()]);
  readonly mp4=computed(()=> (this.mobileViewport() ? mediaUrl(this.mobileMp4Url()) : null) ?? mediaUrl(this.mp4Url()));
  readonly showreel=computed(()=> /^[A-Za-z0-9_-]{11}$/.test(this.youTubeId() ?? '') ? `https://www.youtube.com/watch?v=${this.youTubeId()}` : null);
  readonly poster=computed(()=> (this.mobileViewport() ? mediaUrl(this.mobilePosterUrl()) : null) ?? mediaUrl(this.posterUrl()) ?? (this.showreel() ? `https://i.ytimg.com/vi/${this.youTubeId()}/maxresdefault.jpg` : '/assets/demo/east-west-studio.svg'));
  readonly reducedMotion=signal(false);
  readonly mediaRequested=signal(!(navigator as Navigator & {connection?:{saveData?:boolean}}).connection?.saveData);
  readonly ready=signal(false); readonly playing=signal(false); readonly broken=signal(false);
  readonly manualPause=signal(false); readonly posterFailed=signal(false);
  readonly video=viewChild<ElementRef<HTMLVideoElement>>('backgroundVideo');
  private readonly host=inject(ElementRef<HTMLElement>);
  private visible=true;
  private generation=0;

  constructor() {
    const destroy=inject(DestroyRef);
    const viewport=window.matchMedia?.('(max-width: 767px)');
    this.mobileViewport.set(viewport?.matches ?? false);
    const resized=()=>this.mobileViewport.set(viewport?.matches ?? false);
    viewport?.addEventListener?.('change',resized);
    destroy.onDestroy(()=>viewport?.removeEventListener?.('change',resized));
    const preference=window.matchMedia?.('(prefers-reduced-motion: reduce)');
    this.reducedMotion.set(preference?.matches ?? false);
    const change=()=>this.reducedMotion.set(preference?.matches ?? false);
    preference?.addEventListener?.('change',change);
    destroy.onDestroy(()=>preference?.removeEventListener?.('change',change));
    effect(onCleanup=>{
      const video=this.video()?.nativeElement; const source=this.mp4();
      if (!video || !source) return;
      untracked(()=>{this.ready.set(false);this.broken.set(false);this.playing.set(false);});
      this.generation++; video.muted=true; video.defaultMuted=true;
      const canplay=()=>this.tryPlay();
      const played=()=>{this.ready.set(true);this.playing.set(true);};
      const paused=()=>this.playing.set(false);
      const error=()=>{this.broken.set(true);this.ready.set(false);video.pause();this.playing.set(false);};
      video.addEventListener('canplay',canplay);video.addEventListener('playing',played);video.addEventListener('pause',paused);video.addEventListener('error',error);
      const visibility=()=>{if(document.hidden) {video.pause();this.playing.set(false);} else this.tryPlay();};
      document.addEventListener('visibilitychange',visibility);
      const observer=typeof IntersectionObserver!=='undefined' ? new IntersectionObserver(entries=>{
        this.visible=entries.some(entry=>entry.isIntersecting);
        if(this.visible) this.tryPlay(); else {video.pause();this.playing.set(false);}
      },{threshold:0.05}) : null;
      observer?.observe(this.host.nativeElement);
      untracked(()=>this.tryPlay());
      onCleanup(()=>{this.generation++;observer?.disconnect();document.removeEventListener('visibilitychange',visibility);video.removeEventListener('canplay',canplay);video.removeEventListener('playing',played);video.removeEventListener('pause',paused);video.removeEventListener('error',error);video.pause();});
    });
    effect(()=>{this.poster();untracked(()=>this.posterFailed.set(false));});
  }
  private tryPlay(): void {
    const video=this.video()?.nativeElement;
    if(!video || this.manualPause() || this.reducedMotion() || this.broken() || !this.visible || document.hidden) return;
    const generation=this.generation;
    // Browser permission failures are expected. Never hide the poster before actual playback.
    void video.play()?.catch(()=>{if(generation===this.generation) this.playing.set(false);});
  }
  togglePlayback(): void {
    if(this.reducedMotion()) return;
    if(!this.mediaRequested()) {this.manualPause.set(false);this.mediaRequested.set(true);return;}
    const pause=this.playing(); this.manualPause.set(pause);
    if(pause) {this.video()?.nativeElement.pause();this.playing.set(false);} else this.tryPlay();
  }
}
