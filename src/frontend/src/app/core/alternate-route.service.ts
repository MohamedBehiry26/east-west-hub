import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AlternateRouteService {
  readonly url = signal<string | null>(null);
  set(url: string | null): void { this.url.set(url); }
}
