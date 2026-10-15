import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CinematicHeroComponent } from './cinematic-hero.component';

let play: ReturnType<typeof vi.spyOn>; let pause: ReturnType<typeof vi.spyOn>;
let intersection: (entries:{isIntersecting:boolean}[])=>void;
let preferenceChanged: ()=>void;
let matches=false; let mobileMatches=false; let viewportChanged: ()=>void;
let disconnect=vi.fn(); const remove=vi.fn();
beforeEach(()=>{
 matches=false;mobileMatches=false;disconnect=vi.fn();remove.mockReset();
 play=vi.spyOn(HTMLMediaElement.prototype,'play').mockResolvedValue(undefined);
 pause=vi.spyOn(HTMLMediaElement.prototype,'pause').mockImplementation(()=>{});
 vi.spyOn(document,'hidden','get').mockReturnValue(false);
 vi.stubGlobal('matchMedia',(query:string)=>query.includes('max-width') ? ({get matches(){return mobileMatches;},addEventListener:(_type:string,fn:()=>void)=>viewportChanged=fn,removeEventListener:remove}) : ({get matches(){return matches;},addEventListener:(_type:string,fn:()=>void)=>preferenceChanged=fn,removeEventListener:remove}));
 vi.stubGlobal('IntersectionObserver',class {constructor(fn:typeof intersection){intersection=fn;}observe(){} disconnect=disconnect;});
 TestBed.configureTestingModule({providers:[provideRouter([])]});
});
afterEach(()=>{TestBed.resetTestingModule();vi.restoreAllMocks();vi.unstubAllGlobals();});
function render(language:'ar'|'en'='en',url:string|null='https://media.example.test/showreel.mp4') {
 const f=TestBed.createComponent(CinematicHeroComponent);f.componentRef.setInput('language',language);f.componentRef.setInput('mp4Url',url);f.componentRef.setInput('posterUrl','/branding/poster.webp');f.detectChanges();return f;
}
for(const language of ['ar','en'] as const) it(`renders the ${language} copy, localized CTAs and covering native video`,async()=>{
 const f=render(language);await f.whenStable();f.detectChanges();const video=f.nativeElement.querySelector('video') as HTMLVideoElement;
 expect(video.muted).toBe(true);expect(video.loop).toBe(true);expect(video.playsInline).toBe(true);expect(video.controls).toBe(false);expect(video.preload).toBe('metadata');expect(play).toHaveBeenCalled();
 expect(f.nativeElement.querySelector('h1').textContent).toBe(language==='ar'?'نحوّل الأفكار إلى قصص تستحق المشاهدة.':'We Turn Ideas Into Stories Worth Watching.');
 expect(f.nativeElement.querySelector('section').getAttribute('dir')).toBe(language==='ar'?'rtl':'ltr');expect(f.nativeElement.querySelector('.ewh-cinema__primary').getAttribute('href')).toBe('/'+language+'/projects');expect(f.nativeElement.querySelector('.ewh-cinema__secondary').getAttribute('href')).toBe('/'+language+'/services');
 video.dispatchEvent(new Event('playing'));f.detectChanges();expect(video.classList.contains('is-ready')).toBe(true);
 const setter=vi.spyOn(video,'src','set');window.dispatchEvent(new Event('scroll'));f.detectChanges();expect(setter).not.toHaveBeenCalled();
});
it('uses only the poster for reduced motion and responds to preference changes',async()=>{
 matches=true;const f=render();await f.whenStable();expect(f.nativeElement.querySelector('video')).toBeNull();expect(play).not.toHaveBeenCalled();matches=false;preferenceChanged();f.detectChanges();await f.whenStable();expect(f.nativeElement.querySelector('video')).not.toBeNull();
});
it('keeps the poster and allows deliberate retry when autoplay is rejected',async()=>{
 play.mockRejectedValue(new Error('NotAllowedError'));const f=render();await f.whenStable();expect(f.componentInstance.ready()).toBe(false);expect(f.componentInstance.playing()).toBe(false);
 play.mockResolvedValue(undefined);f.componentInstance.togglePlayback();expect(play).toHaveBeenCalledTimes(2);f.nativeElement.querySelector('video').dispatchEvent(new Event('playing'));f.detectChanges();expect(f.componentInstance.ready()).toBe(true);
});
it('pauses off-screen and in hidden tabs, and preserves a visitor-requested pause',async()=>{
 const f=render();await f.whenStable();const video=f.nativeElement.querySelector('video');video.dispatchEvent(new Event('playing'));intersection([{isIntersecting:false}]);expect(pause).toHaveBeenCalled();const calls=play.mock.calls.length;intersection([{isIntersecting:true}]);expect(play.mock.calls.length).toBeGreaterThan(calls);
 video.dispatchEvent(new Event('playing'));f.componentInstance.togglePlayback();const manualCalls=play.mock.calls.length;intersection([{isIntersecting:true}]);expect(play.mock.calls.length).toBe(manualCalls);
 vi.spyOn(document,'hidden','get').mockReturnValue(true);document.dispatchEvent(new Event('visibilitychange'));expect(f.componentInstance.playing()).toBe(false);
 f.destroy();expect(disconnect).toHaveBeenCalled();expect(remove).toHaveBeenCalled();
});
it('falls back on video/image errors while text and CTAs stay usable',async()=>{
 const f=render('ar');await f.whenStable();f.nativeElement.querySelector('video').dispatchEvent(new Event('error'));f.detectChanges();expect(f.componentInstance.broken()).toBe(true);expect(f.nativeElement.querySelector('button')).toBeNull();expect(f.nativeElement.querySelector('[role="status"]').textContent).toContain('تعذر');expect(f.nativeElement.querySelector('.ewh-cinema__primary')).not.toBeNull();
 f.nativeElement.querySelector('img').dispatchEvent(new Event('error'));f.detectChanges();expect(f.nativeElement.querySelector('img').getAttribute('src')).toBe('/assets/demo/east-west-studio.svg');
});
it('does not embed YouTube, load unsafe URLs or require configured video',()=>{
 const f=render('en','javascript:alert(1)');f.componentRef.setInput('youTubeId','M7lc1UVf-VE');f.detectChanges();expect(f.nativeElement.querySelector('video,iframe')).toBeNull();expect(f.nativeElement.querySelector('a[target="_blank"]').getAttribute('rel')).toContain('noopener');expect(f.nativeElement.querySelector('h1')).not.toBeNull();
});

it('defers media loading for data-saving connections until explicit activation',async()=>{
 const actual=window.navigator;vi.spyOn(window,'navigator','get').mockReturnValue(Object.assign(Object.create(actual),{connection:{saveData:true}}));const f=render();await f.whenStable();expect(f.nativeElement.querySelector('video')).toBeNull();expect(play).not.toHaveBeenCalled();f.componentInstance.togglePlayback();f.detectChanges();await f.whenStable();expect(f.nativeElement.querySelector('video')).not.toBeNull();expect(play).toHaveBeenCalled();
});

it('selects responsive media and poster, preserves manual pause on resize and removes listeners',async()=>{
 const f=render();f.componentRef.setInput('mobileMp4Url','/local-hero-preview/mobile.mp4');f.componentRef.setInput('mobilePosterUrl','/local-hero-preview/mobile.webp');f.detectChanges();await f.whenStable();
 expect(f.componentInstance.mp4()).toBe('https://media.example.test/showreel.mp4');
 f.nativeElement.querySelector('video').dispatchEvent(new Event('playing'));f.componentInstance.togglePlayback();
 const calls=play.mock.calls.length;mobileMatches=true;viewportChanged();f.detectChanges();await f.whenStable();
 expect(f.componentInstance.mp4()).toBe('/local-hero-preview/mobile.mp4');expect(f.componentInstance.poster()).toBe('/local-hero-preview/mobile.webp');expect(play.mock.calls.length).toBe(calls);
 mobileMatches=false;viewportChanged();f.detectChanges();await f.whenStable();expect(f.componentInstance.poster()).toBe('/branding/poster.webp');
 f.destroy();expect(remove).toHaveBeenCalledWith('change',viewportChanged);
});

it('falls back to validated desktop media when mobile URLs are absent or unsafe',()=>{
 mobileMatches=true;const f=render();f.componentRef.setInput('mobileMp4Url','javascript:alert(1)');f.componentRef.setInput('mobilePosterUrl','https://user:secret@example.test/poster.webp');f.detectChanges();
 expect(f.componentInstance.mp4()).toBe('https://media.example.test/showreel.mp4');expect(f.componentInstance.poster()).toBe('/branding/poster.webp');
});
