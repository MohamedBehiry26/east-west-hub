import { Directive, ElementRef, HostListener, inject } from '@angular/core';

@Directive({ selector: 'img[ewImage]', standalone: true })
export class ImageFallbackDirective {
  private readonly image = inject<ElementRef<HTMLImageElement>>(ElementRef).nativeElement;
  @HostListener('error') fallback(): void {
    if (this.image.dataset['fallback']) return;
    this.image.dataset['fallback'] = 'true';
    this.image.src = '/assets/demo/east-west-studio.svg';
    this.image.removeAttribute('srcset');
    // Retain the content title as accessible context; the replacement is an illustration.
  }
}
