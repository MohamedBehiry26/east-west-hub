import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AdminSettingsPage } from './admin-settings.page';

const settings = {
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
  });

  afterEach(() => http.verify());

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
});

