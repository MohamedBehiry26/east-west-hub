import { AfterViewInit, Directive, ElementRef, OnDestroy, inject } from '@angular/core';

/** A single frame per pointer update, only on visible desktop scenes. No render loop. */
@Directive({ selector: '[ewMediaDepth]', standalone: true })
export class MediaDepthDirective implements AfterViewInit, OnDestroy {
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private observer?: IntersectionObserver;
  private preference?: MediaQueryList;
  private visible = false;
  private frame = 0;
  private readonly reset = () => {
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.element.style.removeProperty('--tilt-x');
    this.element.style.removeProperty('--tilt-y');
  };
  private readonly move = (event: PointerEvent) => {
    if (!this.visible || !this.preference?.matches || document.hidden) return;
    cancelAnimationFrame(this.frame);
    this.frame = requestAnimationFrame(() => {
      const rect = this.element.getBoundingClientRect();
      this.element.style.setProperty('--tilt-x', `${((event.clientY - rect.top) / rect.height - .5) * -7}deg`);
      this.element.style.setProperty('--tilt-y', `${((event.clientX - rect.left) / rect.width - .5) * 9}deg`);
    });
  };
  ngAfterViewInit(): void {
    if (!window.matchMedia || !window.IntersectionObserver) return;
    this.preference = window.matchMedia('(min-width: 1024px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)');
    this.preference.addEventListener('change', this.reset);
    this.observer = new IntersectionObserver(entries => {
      this.visible = entries.some(entry => entry.isIntersecting);
      if (!this.visible) this.reset();
    });
    this.observer.observe(this.element);
    this.element.addEventListener('pointermove', this.move, { passive: true });
    this.element.addEventListener('pointerleave', this.reset);
    document.addEventListener('visibilitychange', this.reset);
  }
  ngOnDestroy(): void {
    this.reset(); this.observer?.disconnect();
    this.preference?.removeEventListener('change', this.reset);
    this.element.removeEventListener('pointermove', this.move);
    this.element.removeEventListener('pointerleave', this.reset);
    document.removeEventListener('visibilitychange', this.reset);
  }
}
