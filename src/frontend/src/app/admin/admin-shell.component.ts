import { AfterRenderRef, Component, DestroyRef, ElementRef, Injector, OnInit, ViewChild, ViewEncapsulation, afterNextRender, inject, signal } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { AdminLocaleService } from '../core/admin-locale.service';
import { AdminTextPipe } from '../core/admin-text.pipe';

@Component({
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, AdminTextPipe],
  templateUrl: './admin-shell.component.html',
  styleUrls: ['./admin-shell.css', './admin-sidebar-navigation.css'],
  encapsulation: ViewEncapsulation.None
})
export class AdminShellComponent implements OnInit {
  readonly auth = inject(AuthService); private readonly router = inject(Router); readonly locale = inject(AdminLocaleService);
  readonly drawerOpen = signal(false); readonly collapsed = signal(false);
  readonly mobileNavigation = signal(false);
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);
  private focusRender?: AfterRenderRef;
  private drawerTrigger?: HTMLElement;
  @ViewChild('sidebar') sidebar?: ElementRef<HTMLElement>;
  @ViewChild('menuToggle') menuToggle?: ElementRef<HTMLButtonElement>;
  private readonly allLinks = [
    { path: '/admin', label: 'Overview', icon: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z' },
    { path: '/admin/videos', label: 'Media', icon: 'M3 5h18v14H3zM10 8l6 4-6 4z' },
    { path: '/admin/podcasts', label: 'Podcasts', icon: 'M9 3h6v12H9zM6 10v4a6 6 0 0 0 12 0v-4M12 20v3M8 23h8' },    { path: '/admin/categories', label: 'Categories', icon: 'M3 5h7l2 3h9v12H3z' },
    { path: '/admin/tags', label: 'Tags', icon: 'M3 3h8l10 10-8 8L3 11zM7 7h1' },
    { path: '/admin/services', label: 'Services', icon: 'M8 3h8v4H8zM3 7h18v14H3zM3 12h18M10 11v3h4v-3' },
    { path: '/admin/portfolio', label: 'Projects', icon: 'M3 3h18v18H3zM3 15l6-6 5 5 3-3 4 4' },
    { path: '/admin/articles', label: 'Insights', icon: 'M5 3h14v18H5zM8 7h8M8 11h8M8 15h5' },
    { path: '/admin/accounts', label: 'Admin accounts', icon: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0M20 8v6M17 11h6' },
    { path: '/admin/settings', label: 'Settings', icon: 'M3 6h18M3 12h18M3 18h18M8 3v6M16 9v6M8 15v6' }
  ];
  get links() { return this.allLinks.filter(link => link.path !== '/admin/accounts' || this.auth.currentUser()?.canManageAccounts === true); }
  pageTitle(): string { return this.links.find(item => item.path === this.router.url.split(/[?#]/)[0])?.label ?? 'Workspace'; }
  openDrawer(): void {
    if (!this.mobileNavigation() || this.drawerOpen()) return;
    this.drawerTrigger = this.menuToggle?.nativeElement;
    this.drawerOpen.set(true);
    this.scheduleFocus(() => {
      if (this.drawerOpen()) this.drawerItems()[0]?.focus({ preventScroll: true });
    });
  }
  closeDrawer(restore = true): void {
    if (!this.drawerOpen()) return;
    this.drawerOpen.set(false);
    const trigger = this.drawerTrigger;
    this.drawerTrigger = undefined;
    this.scheduleFocus(() => {
      if (restore && !this.drawerOpen() && trigger?.isConnected && trigger.getClientRects().length) {
        trigger.focus({ preventScroll: true });
      }
    });
  }
  private scheduleFocus(callback: () => void): void {
    this.focusRender?.destroy();
    this.focusRender = afterNextRender(() => {
      this.focusRender = undefined;
      callback();
    }, { injector: this.injector });
  }
  private drawerItems(): HTMLElement[] {
    return Array.from(this.sidebar?.nativeElement.querySelectorAll<HTMLElement>(
      'a[href], button, input, select, textarea, [tabindex]'
    ) ?? []).filter(item => item.tabIndex >= 0 && !item.matches(':disabled')
      && !item.closest('[inert], [hidden]') && item.getClientRects().length > 0
      && this.document.defaultView?.getComputedStyle(item).visibility !== 'hidden');
  }
  drawerKey(event: KeyboardEvent): void {
    if (!this.drawerOpen()) return;
    if (event.key === 'Escape') { event.preventDefault(); this.closeDrawer(); return; }
    if (event.key !== 'Tab') return;
    const items = this.drawerItems();
    const first = items[0], last = items.at(-1);
    const active = this.document.activeElement;
    if (!first || !last) { event.preventDefault(); this.sidebar?.nativeElement.focus(); return; }
    if (!items.includes(active as HTMLElement) || (event.shiftKey ? active === first : active === last)) {
      event.preventDefault();
      (event.shiftKey ? last : first).focus({ preventScroll: true });
    }
  }
  ngOnInit(): void {
    this.locale.set(this.locale.locale());
    const query = this.document.defaultView?.matchMedia?.('(max-width: 1023px)');
    if (query) {
      this.mobileNavigation.set(query.matches);
      const changed = () => {
        this.mobileNavigation.set(query.matches);
        if (!query.matches) this.closeDrawer(false);
      };
      query.addEventListener('change', changed);
      this.destroyRef.onDestroy(() => query.removeEventListener('change', changed));
    }
    this.destroyRef.onDestroy(() => this.focusRender?.destroy());
  }
  async navigate(path: string): Promise<void> {
    const completed = await this.router.navigateByUrl(path);
    if (completed || this.router.url.split(/[?#]/)[0] === path) this.closeDrawer();
  }
  toggleLocale(): void { this.locale.set(this.locale.locale() === 'en' ? 'ar' : 'en'); }
  logout(): void { this.auth.logout(); void this.router.navigate(['/admin/login']); }
}

