import { Component, ElementRef, OnInit, ViewChild, ViewEncapsulation, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
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
  @ViewChild('sidebar') sidebar?: ElementRef<HTMLElement>;
  @ViewChild('menuToggle') menuToggle?: ElementRef<HTMLButtonElement>;
  readonly links = [
    { path: '/admin', label: 'Overview', icon: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z' },
    { path: '/admin/videos', label: 'Media', icon: 'M3 5h18v14H3zM10 8l6 4-6 4z' },
    { path: '/admin/podcasts', label: 'Podcasts', icon: 'M9 3h6v12H9zM6 10v4a6 6 0 0 0 12 0v-4M12 20v3M8 23h8' },
    { path: '/admin/youtube', label: 'YouTube sync', icon: 'M20 7a9 9 0 0 0-15-2L2 8m0-5v5h5M4 17a9 9 0 0 0 15 2l3-3m0 5v-5h-5' },
    { path: '/admin/categories', label: 'Categories', icon: 'M3 5h7l2 3h9v12H3z' },
    { path: '/admin/tags', label: 'Tags', icon: 'M3 3h8l10 10-8 8L3 11zM7 7h1' },
    { path: '/admin/services', label: 'Services', icon: 'M8 3h8v4H8zM3 7h18v14H3zM3 12h18M10 11v3h4v-3' },
    { path: '/admin/portfolio', label: 'Projects', icon: 'M3 3h18v18H3zM3 15l6-6 5 5 3-3 4 4' },
    { path: '/admin/articles', label: 'Insights', icon: 'M5 3h14v18H5zM8 7h8M8 11h8M8 15h5' },
    { path: '/admin/settings', label: 'Settings', icon: 'M3 6h18M3 12h18M3 18h18M8 3v6M16 9v6M8 15v6' }
  ];
  pageTitle(): string { return this.links.find(item => item.path === this.router.url.split(/[?#]/)[0])?.label ?? 'Workspace'; }
  openDrawer(): void { this.drawerOpen.set(true); queueMicrotask(() => this.sidebar?.nativeElement.querySelector<HTMLAnchorElement>('a')?.focus()); }
  closeDrawer(restore = false): void { this.drawerOpen.set(false); if (restore) this.menuToggle?.nativeElement.focus(); }
  drawerKey(event: KeyboardEvent): void {
    if (!this.drawerOpen()) return;
    if (event.key === 'Escape') { event.preventDefault(); this.closeDrawer(true); }
    if (event.key === 'Tab') {
      const items = Array.from(this.sidebar?.nativeElement.querySelectorAll<HTMLElement>('a, button:not(.sidebar-collapse)') ?? []);
      const first = items[0], last = items.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
  }
  ngOnInit(): void { this.locale.set(this.locale.locale()); }
  async navigate(path: string): Promise<void> {
    const completed = await this.router.navigateByUrl(path);
    if (completed) this.closeDrawer();
  }
  toggleLocale(): void { this.locale.set(this.locale.locale() === 'en' ? 'ar' : 'en'); }
  logout(): void { this.auth.logout(); void this.router.navigate(['/admin/login']); }
}
