import { AfterViewInit, Directive, ElementRef, OnDestroy, inject } from '@angular/core';

/** Progressive enhancement: content stays visible when observers or motion are unavailable. */
@Directive({ selector: '[ewReveal]', standalone: true })
export class RevealDirective implements AfterViewInit, OnDestroy {
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private observer?: IntersectionObserver;
  private animation?: Animation;
  private preference?: MediaQueryList;
  private readonly stop = () => this.animation?.cancel();

  ngAfterViewInit(): void {
    if (!window.matchMedia || !window.IntersectionObserver || !this.element.animate) return;
    this.preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.preference.addEventListener('change', this.stop);
    if (this.preference.matches) return;
    this.observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      if (!this.preference?.matches) {
        this.animation = this.element.animate(
          [{ opacity: .55, transform: 'translateY(20px)' }, { opacity: 1, transform: 'translateY(0)' }],
          { duration: 650, easing: 'cubic-bezier(.2,.65,.25,1)' }
        );
      }
      this.observer?.disconnect();
    }, { threshold: .08 });
    this.observer.observe(this.element);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.preference?.removeEventListener('change', this.stop);
    this.animation?.cancel();
  }
}
