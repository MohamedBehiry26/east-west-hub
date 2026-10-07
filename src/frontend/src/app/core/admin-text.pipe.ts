import { Pipe, PipeTransform, inject } from '@angular/core';
import { AdminLocaleService } from './admin-locale.service';

@Pipe({ name: 'adminText', standalone: true, pure: false })
export class AdminTextPipe implements PipeTransform {
  private readonly locale = inject(AdminLocaleService);
  transform(key: string): string { return this.locale.text(key); }
}
