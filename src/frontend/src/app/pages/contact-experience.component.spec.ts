import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NgForm } from '@angular/forms';
import { ContactExperienceComponent } from './contact-experience.component';
import { PublicSiteSettings } from '../core/public-content.models';

const site: PublicSiteSettings = { agencyName:'East West Hub',agencyDescription:null,email:'qa@example.test',phone:'+20 100 000 0000',address:null,socialLinks:[],logoUrl:null,faviconUrl:null };
async function setup(locale: 'ar'|'en' = 'en', settings: PublicSiteSettings | null = site) {
  const fixture = TestBed.createComponent(ContactExperienceComponent);
  fixture.componentRef.setInput('locale', locale); fixture.componentRef.setInput('settings', settings);
  fixture.detectChanges(); await fixture.whenStable();
  const form = fixture.debugElement.query(By.directive(NgForm)).injector.get(NgForm);
  return { fixture, form, c: fixture.componentInstance };
}
describe('Contact email-draft experience', () => {
  for (const locale of ['ar','en'] as const) it(`validates and composes a ${locale} draft without claiming delivery`, async () => {
    const { fixture, form, c } = await setup(locale);
    const launch = vi.spyOn(c,'openDraft').mockImplementation(() => {});
    c.submit(form); fixture.detectChanges();
    expect(launch).not.toHaveBeenCalled(); expect(form.controls['name'].touched).toBe(true);
    expect(fixture.nativeElement.querySelector('#name-error').textContent.trim()).toBeTruthy();
    c.name='QA visitor'; c.visitorEmail='visitor@example.test'; c.visitorPhone='';
    c.service='video-production'; c.details='A production project.\nWith multiple lines.';
    fixture.detectChanges(); await fixture.whenStable(); c.submit(form); fixture.detectChanges();
    expect(launch).toHaveBeenCalledOnce(); const url=new URL(c.draftUrl());
    expect(url.pathname).toBe('qa@example.test');
    expect(url.searchParams.get('subject')).toBe('Project Inquiry - East West Hub');
    expect(url.searchParams.get('body')).toContain(c.services().find(s=>s.value==='video-production')!.label);
    expect(url.searchParams.get('body')).toContain('visitor@example.test');
    expect(c.feedback()).toBe('draft'); expect(c.submitting()).toBe(false);
    expect(c.copy().draftReady).not.toMatch(/successfully sent|تم إرسال/);
  });
  it('hides absent and unsafe company links without inventing details', async () => {
    const {fixture,c}=await setup('en',{...site,email:'bad?subject=x',phone:'javascript:evil',address:' ',socialLinks:[{platform:'Bad',url:'javascript:evil'},{platform:'Bad',url:'https://user:secret@example.test'},{platform:'WhatsApp',url:'https://wa.me/201000000000'},{platform:'Instagram',url:'https://instagram.com/example'}]});
    expect(c.email()).toBe('');expect(c.phone()).toBe('');expect(c.social().length).toBe(1);expect(c.whatsapp()?.platform).toBe('WhatsApp');
    expect(c.emailLink()).toBe('');
    expect(fixture.nativeElement.querySelector('button[type=submit]').disabled).toBe(true);
    expect(fixture.nativeElement.textContent).not.toMatch(/Coming soon|Contact details will be added soon/);
    expect(fixture.nativeElement.querySelector('a[href^="javascript:"]')).toBeNull();
  });
  it('recovers from email-client failures and preserves fields', async () => {
    const {fixture,form,c}=await setup();c.name='QA';c.visitorEmail='visitor@example.test';c.details='Project details for QA';
    fixture.detectChanges();await fixture.whenStable();vi.spyOn(c,'openDraft').mockImplementation(()=>{throw new Error('blocked');});
    c.submit(form);expect(c.feedback()).toBe('error');expect(c.submitting()).toBe(false);expect(c.details).toBe('Project details for QA');
    fixture.detectChanges();expect(fixture.nativeElement.querySelector('.contact-notice a[href^="mailto:"]')).not.toBeNull();
  });
  it('blocks reentrant submissions during handoff', async () => {
    const {fixture,form,c}=await setup();c.name='QA';c.visitorEmail='visitor@example.test';c.details='Project details for QA';fixture.detectChanges();await fixture.whenStable();
    const launch=vi.spyOn(c,'openDraft').mockImplementation(()=>c.submit(form));c.submit(form);expect(launch).toHaveBeenCalledOnce();
  });
  it('offers retry and prevents handoff while settings fail to load', async () => {
    const {fixture,c}=await setup('ar',null);fixture.componentRef.setInput('loadError',true);fixture.detectChanges();
    const retry=vi.fn();c.retry.subscribe(retry);fixture.nativeElement.querySelector('.company-panel button').click();expect(retry).toHaveBeenCalledOnce();
    expect(fixture.nativeElement.querySelector('button[type=submit]').disabled).toBe(true);
  });
  it('rejects short trimmed fields and punctuation-only phone numbers', async () => {
    const {fixture,form,c}=await setup();c.name=' X ';c.visitorEmail='visitor@example.test';c.details='     brief    ';c.visitorPhone='------';
    fixture.detectChanges();await fixture.whenStable();const launch=vi.spyOn(c,'openDraft');c.submit(form);
    expect(launch).not.toHaveBeenCalled();expect(form.controls['name'].invalid).toBe(true);expect(form.controls['details'].invalid).toBe(true);expect(form.controls['phone'].invalid).toBe(true);
  });
  for (const locale of ['ar','en'] as const) it(`shows a welcoming ${locale} fallback without duplicate company names or technical errors`, async () => {
    const {fixture,c}=await setup(locale,null);fixture.componentRef.setInput('loadError',true);fixture.detectChanges();
    const panel=fixture.nativeElement.querySelector('.company-panel');
    expect(panel.textContent.split('East West Hub').length-1).toBe(1);
    expect(panel.textContent).toContain(c.copy().welcome);
    expect(panel.querySelector('.company-rows')).toBeNull();
    expect(panel.textContent).not.toMatch(/HttpErrorResponse|ECONNREFUSED|500|localhost/);
    expect(fixture.nativeElement.querySelector('.contact-layout').firstElementChild.tagName).toBe('FORM');
  });
});
