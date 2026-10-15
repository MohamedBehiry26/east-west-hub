import { Injectable, signal } from '@angular/core';
import { PublicCategory, PublicTag } from './public-content.models';

@Injectable({ providedIn: 'root' })
export class AlternateRouteService {
  readonly url = signal<string | null>(null);
  readonly categories = signal<PublicCategory[]>([]);
  readonly tags = signal<PublicTag[]>([]);
  set(url: string | null): void { this.url.set(url); }
}
