import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AdminLocaleService } from '../core/admin-locale.service';
import { AdminSettingsPage } from './admin-settings.page';

const settings = {version:'a1111111-1111-4111-8111-111111111111',exists:true,
  agencyNameEn: 'East West Hub', agencyNameAr: 'إيست ويست هب', agencyDescriptionEn: null, agencyDescriptionAr: null,
  logoUrl: null, faviconUrl: null, email: null, phone: null, addressEn: null, addressAr: null,
  defaultSeoTitleEn: null, defaultSeoTitleAr: null, defaultSeoDescriptionEn: null, defaultSeoDescriptionAr: null, socialLinks: []
};

describe('AdminSettingsPage', () => {
  let http: HttpTestingController;

  function createPage() {
    const fixture = TestBed.createComponent(AdminSettingsPage);
    fixture.detectChanges();
    http.expectOne('/api/admin/settings').flush(settings);
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    TestBed.inject(AdminLocaleService).locale.set('en');
  });

  afterEach(() => http.verify());

  it('saves MP4, poster and existing YouTube settings together without dropping other values', () => {
    const fixture=createPage();const c=fixture.componentInstance;c.model.heroMp4Url='https://media.example.test/hero.mp4';c.model.heroPosterImageUrl='/branding/poster.webp';c.model.heroVideoUrl='https://youtu.be/M7lc1UVf-VE';c.save();
    const request=http.expectOne('/api/admin/settings');expect(request.request.body.agencyNameEn).toBe(settings.agencyNameEn);expect(request.request.body.heroMp4Url).toContain('hero.mp4');expect(request.request.body.heroPosterImageUrl).toBe('/branding/poster.webp');expect(request.request.body.heroVideoUrl).toContain('M7lc1UVf-VE');request.flush({...settings,heroMp4Url:c.model.heroMp4Url,heroPosterImageUrl:c.model.heroPosterImageUrl,heroVideoUrl:c.model.heroVideoUrl});expect(c.saving).toBe(false);
  });
  it('loads an empty draft through GET and creates settings through PUT on the same route', () => {
    const fixture = TestBed.createComponent(AdminSettingsPage);
    fixture.detectChanges();
    const get = http.expectOne('/api/admin/settings');
    expect(get.request.method).toBe('GET');
    get.flush({ ...settings, version:null,exists:false,agencyNameEn: '', agencyNameAr: '', socialLinks: [] });
    expect(fixture.componentInstance.loading).toBe(false);
    expect(fixture.componentInstance.error).toBe('');
    http.expectNone('/api/admin/settings');
    fixture.componentInstance.model.agencyNameEn = 'Owner supplied';
    fixture.componentInstance.model.agencyNameAr = 'اسم المالك';
    fixture.componentInstance.save();
    const put = http.expectOne('/api/admin/settings');
    expect(put.request.method).toBe('PUT');
    expect(put.request.body.agencyNameEn).toBe('Owner supplied');
    put.flush({ ...settings, agencyNameEn: 'Owner supplied', agencyNameAr: 'اسم المالك' });
    expect(fixture.componentInstance.saving).toBe(false);
    expect(fixture.componentInstance.message).toBe('Settings saved.');
  });

  it('saves the independent homepage hero link', () => {
    const fixture = createPage();
    fixture.componentInstance.model.heroVideoUrl = 'https://youtu.be/M7lc1UVf-VE';
    fixture.componentInstance.save();
    const request = http.expectOne('/api/admin/settings');
    expect(request.request.body.heroVideoUrl).toBe('https://youtu.be/M7lc1UVf-VE');
    request.flush({...settings,heroVideoUrl:'https://www.youtube.com/watch?v=M7lc1UVf-VE'});
    expect(fixture.componentInstance.model.heroVideoUrl).toContain('M7lc1UVf-VE');
  });

  it('recovers from an unauthorized save and reports an actionable error', () => {
    const fixture = createPage();
    const component = fixture.componentInstance;

    component.save();
    http.expectOne('/api/admin/settings').flush({}, { status: 401, statusText: 'Unauthorized' });
    fixture.detectChanges();

    expect(component.saving).toBe(false);
    expect(component.error).toBe('Your admin session has expired. Sign in again, then retry saving.');
    expect(fixture.nativeElement.querySelector('[role=alert]')?.textContent).toContain('Your admin session has expired');
  });

  it('prevents duplicate save requests while a save is in progress', () => {
    const fixture = createPage();
    const component = fixture.componentInstance;

    component.save();
    component.save();
    const request = http.expectOne('/api/admin/settings');
    request.flush(settings);
    fixture.detectChanges();

    expect(component.saving).toBe(false);
    expect(component.message).toBe('Settings saved.');
  });

  for (const status of [400,403,409,500]) it(`retains settings and can retry after HTTP ${status}`, () => {
    const fixture=createPage();const component=fixture.componentInstance;component.model.agencyNameEn='Edited';
    component.save();http.expectOne('/api/admin/settings').flush({}, {status,statusText:'Error'});
    expect(component.saving).toBe(false);expect(component.loading).toBe(false);expect(component.model.agencyNameEn).toBe('Edited');
    component.save();http.expectOne('/api/admin/settings').flush({...settings,agencyNameEn:'Edited'});
    expect(component.message).toBe('Settings saved.');expect(component.saving).toBe(false);
  });
  it('recovers from a network failure without losing the draft', () => {
    const fixture=createPage();const component=fixture.componentInstance;component.model.heroVideoUrl='https://youtu.be/M7lc1UVf-VE';
    component.save();http.expectOne('/api/admin/settings').error(new ProgressEvent('error'));
    expect(component.saving).toBe(false);expect(component.model.heroVideoUrl).toContain('M7lc1UVf-VE');
  });
  it('recovers when the API never responds', async () => {
    vi.useFakeTimers();
    try {
      const fixture=createPage();const component=fixture.componentInstance;
      component.save();const request=http.expectOne('/api/admin/settings');
      await vi.advanceTimersByTimeAsync(120_001);
      expect(request.cancelled).toBe(true);expect(component.saving).toBe(false);expect(component.loading).toBe(false);expect(component.error).not.toBe('');
    } finally { vi.useRealTimers(); }
  });
  it('blocks save before and during load even with names populated', () => {
    const fixture=TestBed.createComponent(AdminSettingsPage);const c=fixture.componentInstance;
    c.model.agencyNameEn='Name';c.model.agencyNameAr='اسم';c.save();http.expectNone('/api/admin/settings');
    fixture.detectChanges();const get=http.expectOne('/api/admin/settings');
    expect(fixture.nativeElement.querySelector('[type=submit]').disabled).toBe(true);
    expect(fixture.nativeElement.querySelector('form fieldset').disabled).toBe(true);
    c.save();c.load();http.expectNone('/api/admin/settings');get.flush(settings);expect(c.initialized).toBe(true);
  });
  it('blocks failed-load save and safely recovers using one retry GET', () => {
    const fixture=TestBed.createComponent(AdminSettingsPage);fixture.detectChanges();http.expectOne('/api/admin/settings').flush({}, {status:500,statusText:'Error'});fixture.detectChanges();
    const c=fixture.componentInstance;c.model.agencyNameEn='Name';c.model.agencyNameAr='اسم';const original=c.model;c.save();http.expectNone('/api/admin/settings');
    expect(fixture.nativeElement.querySelector('[type=submit]').disabled).toBe(true);expect(c.initialized).toBe(false);
    const retry=Array.from(fixture.nativeElement.querySelectorAll('button')).find((b:any)=>b.textContent.trim()==='Retry') as HTMLButtonElement;
    retry.click();c.load();const get=http.expectOne('/api/admin/settings');expect(get.request.method).toBe('GET');expect(c.model).toBe(original);
    get.flush(settings);fixture.detectChanges();expect(c.initialized).toBe(true);expect(c.error).toBe('');expect(fixture.nativeElement.querySelector('[role=alert]')).toBeNull();
    c.save();const put=http.expectOne('/api/admin/settings');expect(put.request.method).toBe('PUT');put.flush(settings);
  });
  it('preserves social links and hero and unrelated settings in the payload', () => {
    const fixture=TestBed.createComponent(AdminSettingsPage);fixture.detectChanges();
    const loaded={...settings,phone:'fixture-phone',defaultSeoTitleEn:'Fixture SEO',heroMp4Url:'https://example.test/hero.mp4',heroPosterImageUrl:'/poster.webp',socialLinks:[{platform:'YouTube',url:'https://youtube.com/example',displayOrder:2,isVisible:false}]};
    http.expectOne('/api/admin/settings').flush(loaded);const c=fixture.componentInstance;expect(c.model.socialLinks).not.toBe(loaded.socialLinks);expect(c.model.socialLinks[0]).not.toBe(loaded.socialLinks[0]);
    c.model.agencyNameEn='Edited';c.save();const put=http.expectOne('/api/admin/settings');const {version,...fields}=loaded;expect(put.request.body).toEqual({...fields,expectedVersion:version,agencyNameEn:'Edited'});put.flush({...loaded,agencyNameEn:'Edited'});
    c.model.agencyNameEn='Unsaved draft';c.load();http.expectNone('/api/admin/settings');expect(c.model.agencyNameEn).toBe('Unsaved draft');
  });
  it('blocks incomplete required names after initialization', () => {
    const fixture=createPage();fixture.componentInstance.model.agencyNameAr=' ';fixture.componentInstance.save();http.expectNone('/api/admin/settings');
  });
  it('fails closed on malformed initial response', () => {
    const fixture=TestBed.createComponent(AdminSettingsPage);fixture.detectChanges();http.expectOne('/api/admin/settings').flush({...settings,socialLinks:null});expect(fixture.componentInstance.initialized).toBe(false);fixture.componentInstance.save();http.expectNone('/api/admin/settings');
  });
  for(const language of ['en','ar'] as const) it(`announces loading and load errors in ${language}`, () => {
    TestBed.inject(AdminLocaleService).locale.set(language);const fixture=TestBed.createComponent(AdminSettingsPage);fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role=status]').textContent).toContain(language==='ar'?'جارٍ تحميل':'Loading existing');
    http.expectOne('/api/admin/settings').error(new ProgressEvent('error'));fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role=alert]').textContent).toContain(language==='ar'?'لحماية بيانات':'protect site data');expect(fixture.nativeElement.querySelector('[type=submit]').disabled).toBe(true);
  });

});

