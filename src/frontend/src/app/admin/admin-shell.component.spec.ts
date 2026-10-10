import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { AdminLocaleService } from '../core/admin-locale.service';
import { AdminShellComponent } from './admin-shell.component';

@Component({ standalone: true, template: '' })
class DestinationPage {}

describe('AdminShellComponent navigation', () => {
  it('opens every workspace module with one sidebar click', async () => {
    const locale = signal<'en' | 'ar'>('en');
    TestBed.configureTestingModule({
      imports: [AdminShellComponent],
      providers: [
        provideRouter([
          { path: 'admin', component: DestinationPage },
          { path: 'admin/:module', component: DestinationPage }
        ]),
        { provide: AuthService, useValue: { currentUser: () => null, logout: vi.fn() } },
        { provide: AdminLocaleService, useValue: { locale, set: vi.fn(), text: (key: string) => key } }
      ]
    });

    const fixture = TestBed.createComponent(AdminShellComponent);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    const router = TestBed.inject(Router);
    const destinations = [
      ['Overview', '/admin'], ['Media', '/admin/videos'], ['Podcasts', '/admin/podcasts'],
['Categories', '/admin/categories'], ['Tags', '/admin/tags'],
      ['Services', '/admin/services'], ['Projects', '/admin/portfolio'], ['Insights', '/admin/articles'],
      ['Settings', '/admin/settings'], ['Admin accounts', '/admin/accounts']
    ];

    for (const [label, path] of destinations) {
      const button = Array.from(host.querySelectorAll<HTMLButtonElement>('nav button'))
        .find((item) => item.textContent?.includes(label));
      button?.click();
      await fixture.whenStable();
      fixture.detectChanges();
      expect(router.url).toBe(path);
      expect(button?.getAttribute('aria-current')).toBe('page');
    }
  });
});

