import { TestBed } from '@angular/core/testing';
import { AdminLocaleService } from './admin-locale.service';

describe('rebranded admin language preference', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());
  it('reads the previous preference and writes only the new key', () => {
    localStorage.setItem('space-media-admin-locale', 'ar');
    const service = TestBed.inject(AdminLocaleService);
    expect(service.locale()).toBe('ar');
    service.set('en');
    expect(localStorage.getItem('east-west-hub-admin-locale')).toBe('en');
    expect(localStorage.getItem('space-media-admin-locale')).toBe('ar');
  });
  it('prefers the new key when both exist', () => {
    localStorage.setItem('space-media-admin-locale', 'ar');
    localStorage.setItem('east-west-hub-admin-locale', 'en');
    expect(TestBed.inject(AdminLocaleService).locale()).toBe('en');
  });
});
