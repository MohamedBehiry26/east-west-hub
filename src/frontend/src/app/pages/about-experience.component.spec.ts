import { TestBed } from '@angular/core/testing';
import { NavigationEnd, Router, Scroll, provideRouter } from '@angular/router';
import { Subject } from 'rxjs';
import { AboutExperienceComponent } from './about-experience.component';
import { PublicSiteSettings } from '../core/public-content.models';

describe('About editorial experience', () => {
  for (const locale of ['en','ar'] as const) it(`renders four translated stages and the localized Contact link in ${locale}`, () => {
    TestBed.configureTestingModule({providers:[provideRouter([])]});
    const f=TestBed.createComponent(AboutExperienceComponent);f.componentRef.setInput('locale',locale);f.detectChanges();
    expect(f.nativeElement.querySelectorAll('h1').length).toBe(1);
    expect(f.nativeElement.querySelector('article').dir).toBe(locale==='ar'?'rtl':'ltr');
    expect(f.nativeElement.querySelectorAll('.editorial-process li').length).toBe(4);
    expect(f.nativeElement.querySelector('.editorial-process li:last-child').textContent).toContain(locale==='ar'?'النشر والتوزيع':'Publishing & Distribution');
    expect(f.nativeElement.querySelector('.about-contact').getAttribute('href')).toBe(`/${locale}/contact`);
    expect(f.nativeElement.querySelector('.cinematic-study').getAttribute('aria-hidden')).toBe('true');
    expect(f.nativeElement.querySelector('video,iframe,img')).toBeNull();
  });
  it('preserves editable CMS paragraphs and escapes markup rather than interpreting it', () => {
    TestBed.configureTestingModule({providers:[provideRouter([])]});
    const f=TestBed.createComponent(AboutExperienceComponent);
    const settings:PublicSiteSettings={agencyName:'East West Hub',agencyDescription:'Owner-managed description.\n<script>not executed</script>',email:null,phone:null,address:null,socialLinks:[],logoUrl:null,faviconUrl:null};
    f.componentRef.setInput('settings',settings);f.detectChanges();
    expect(f.nativeElement.querySelector('.cms-story').textContent).toBe(settings.agencyDescription);
    expect(f.nativeElement.querySelector('.cms-story script')).toBeNull();
    f.componentRef.setInput('settings',{...settings,agencyDescription:'Updated through Admin Settings'});f.detectChanges();
    expect(f.nativeElement.querySelector('.cms-story').textContent).toBe('Updated through Admin Settings');
  });
  it('uses existing agency scope as fallback without fictional metrics or testimonials', () => {
    TestBed.configureTestingModule({providers:[provideRouter([])]});const f=TestBed.createComponent(AboutExperienceComponent);f.detectChanges();
    expect(f.nativeElement.querySelector('.cms-story').textContent).toContain('content development');
    expect(f.nativeElement.textContent).not.toMatch(/founded|award-winning|trusted by|clients served|team of \d/i);
  });
  it('offsets only About anchors after router scrolling and removes the listener on destruction', async () => {
    TestBed.configureTestingModule({providers:[provideRouter([])]});const f=TestBed.createComponent(AboutExperienceComponent);f.detectChanges();
    const target=f.nativeElement.querySelector('#about-process');target.scrollIntoView=vi.fn();
    const events=TestBed.inject(Router).events as Subject<unknown>;
    events.next(new Scroll(new NavigationEnd(1,'/en/about','/en/about'),null,'about-process'));
    await Promise.resolve();expect(target.scrollIntoView).toHaveBeenCalledWith({block:'start',behavior:'instant'});
    target.scrollIntoView.mockClear();events.next(new Scroll(new NavigationEnd(2,'/en/about','/en/about'),null,'other-page'));await Promise.resolve();expect(target.scrollIntoView).not.toHaveBeenCalled();
    f.destroy();events.next(new Scroll(new NavigationEnd(3,'/en/about','/en/about'),null,'about-process'));await Promise.resolve();expect(target.scrollIntoView).not.toHaveBeenCalled();
  });
});
