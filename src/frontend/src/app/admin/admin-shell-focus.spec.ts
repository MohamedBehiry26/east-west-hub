import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { AdminLocaleService } from '../core/admin-locale.service';
import { AdminShellComponent } from './admin-shell.component';

describe('Admin mobile drawer focus', () => {
  let mobile: boolean;
  let changed: () => void;
  let remove: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    mobile = true; remove = vi.fn();
    vi.stubGlobal('matchMedia', () => ({ get matches() { return mobile; },
      addEventListener: (_: string, listener: () => void) => changed = listener,
      removeEventListener: remove }));
    // jsdom has no layout; real native inert/focus containment is additionally browser-tested.
    vi.spyOn(HTMLElement.prototype, 'getClientRects').mockImplementation(function (this: HTMLElement) {
      return (this.hidden || this.closest('[hidden]') || this.style.display === 'none'
        || (mobile && this.classList.contains('sidebar-collapse')) ? [] : [new DOMRect(0, 0, 40, 40)]) as unknown as DOMRectList;
    });
  });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
  function setup(language: 'en' | 'ar' = 'en') {
    TestBed.configureTestingModule({ imports: [AdminShellComponent], providers: [provideRouter([]),
      { provide: AuthService, useValue: { currentUser: () => ({ canManageAccounts: false }), logout: vi.fn() } },
      { provide: AdminLocaleService, useValue: { locale: signal(language), set: vi.fn(), text: (key: string) => key } }
    ] });
    const f = TestBed.createComponent(AdminShellComponent); f.detectChanges();
    const root = f.nativeElement as HTMLElement;
    const sidebar = root.querySelector<HTMLElement>('.cms-sidebar')!;
    const trigger = root.querySelector<HTMLButtonElement>('.cms-menu-button')!;
    const body = root.querySelector<HTMLElement>('.cms-body')!;
    const render = () => { f.detectChanges(); TestBed.tick(); };
    const open = () => { trigger.focus(); trigger.click(); render(); };
    const key = (value: string, shiftKey = false) => {
      const event = new KeyboardEvent('keydown', { key: value, shiftKey, bubbles: true, cancelable: true });
      document.activeElement?.dispatchEvent(event); return event;
    };
    return { f, sidebar, trigger, body, render, open, key };
  }
  for (const language of ['en', 'ar'] as const) {
    it(`focuses inside after rendering and establishes modality in ${language}`, () => {
      const { f, sidebar, trigger, body, open } = setup(language); open();
      expect(sidebar.contains(document.activeElement)).toBe(true);
      expect(body.inert).toBe(true);
      expect(sidebar.getAttribute('role')).toBe('dialog');
      expect(sidebar.getAttribute('aria-modal')).toBe('true');
      expect(trigger.getAttribute('aria-controls')).toBe(sidebar.id);
      expect(trigger.getAttribute('aria-expanded')).toBe('true');
      expect(f.nativeElement.querySelector('.cms-backdrop').tabIndex).toBe(-1);
    });
  }
  it('wraps both directions and excludes disabled/hidden controls', () => {
    const { sidebar, open, key } = setup();
    const disabled = document.createElement('button'); disabled.disabled = true; sidebar.append(disabled);
    const hidden = document.createElement('button'); hidden.hidden = true; sidebar.append(hidden);
    open(); const first = document.activeElement as HTMLElement;
    const last = sidebar.querySelector<HTMLElement>('.cms-site-link')!;
    last.focus(); expect(key('Tab').defaultPrevented).toBe(true); expect(document.activeElement).toBe(first);
    expect(key('Tab', true).defaultPrevented).toBe(true); expect(document.activeElement).toBe(last);
  });
  it('closes on Escape and restores focus only after removing background inert', () => {
    const { f, trigger, body, render, open, key } = setup(); open(); key('Escape'); render();
    expect(f.componentInstance.drawerOpen()).toBe(false); expect(body.inert).toBe(false);
    expect(document.activeElement).toBe(trigger); expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });
  it('closes through backdrop and close control, without stale callbacks across repeated cycles', () => {
    const { f, trigger, body, render, open } = setup();
    for (let i = 0; i < 3; i++) {
      open(); (f.nativeElement.querySelector(i % 2 ? '.drawer-close' : '.cms-backdrop') as HTMLButtonElement).click(); render();
      expect(body.inert).toBe(false); expect(document.activeElement).toBe(trigger);
    }
    f.componentInstance.openDrawer(); f.componentInstance.closeDrawer(); render();
    expect(document.activeElement).toBe(trigger);
  });
  it('keeps the drawer open when navigation is cancelled, closes when successful', async () => {
    const { f, open, render, body } = setup();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(false);
    open(); await f.componentInstance.navigate('/admin/services'); render(); expect(body.inert).toBe(true);
    navigate.mockResolvedValue(true); await f.componentInstance.navigate('/admin/services'); render(); expect(body.inert).toBe(false);
  });
  it('closes when the selected link is already the active route', async () => {
    const { f, open, render, body } = setup();
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(false);
    vi.spyOn(router, 'url', 'get').mockReturnValue('/admin/services');
    open(); await f.componentInstance.navigate('/admin/services'); render(); expect(body.inert).toBe(false);
  });
  it('does not trap desktop navigation and clears modality when crossing the existing breakpoint', () => {
    const { f, open, render, body, sidebar } = setup(); open(); mobile = false; changed(); render();
    expect(f.componentInstance.drawerOpen()).toBe(false); expect(body.inert).toBe(false); expect(sidebar.inert).toBe(false);
    f.componentInstance.openDrawer(); render(); expect(f.componentInstance.drawerOpen()).toBe(false);
  });
  it('cleans up the breakpoint listener and pending render work on destruction', () => {
    const { f } = setup(); f.componentInstance.openDrawer(); f.destroy(); expect(remove).toHaveBeenCalledOnce();
  });
});
