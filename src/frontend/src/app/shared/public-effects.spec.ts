import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { RevealDirective } from './reveal.directive';
import { MediaDepthDirective } from './media-depth.directive';
import { ImageFallbackDirective } from './image-fallback.directive';

@Component({ standalone: true, imports: [RevealDirective, MediaDepthDirective, ImageFallbackDirective], template: '<section ewReveal>Readable content</section><div ewMediaDepth></div><img ewImage src="/missing.jpg" alt="Media title" />' })
class EffectsHost {}

describe('public motion and asset fallbacks', () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  it('keeps content visible without observer or animation support', () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    const fixture = TestBed.createComponent(EffectsHost); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('section').textContent).toBe('Readable content');
    expect(fixture.nativeElement.querySelector('section').style.opacity).toBe('');
  });

  it('falls back once for failed remote images', () => {
    const fixture = TestBed.createComponent(EffectsHost); fixture.detectChanges();
    const image: HTMLImageElement = fixture.nativeElement.querySelector('img');
    image.dispatchEvent(new Event('error'));
    expect(image.getAttribute('src')).toBe('/assets/demo/east-west-studio.svg');
    image.dispatchEvent(new Event('error'));
    expect(image.dataset['fallback']).toBe('true');
    expect(image.alt).toBe('Media title');
  });

  it('does not animate reveals with reduced motion', () => {
    const animate = vi.fn();
    vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    vi.stubGlobal('IntersectionObserver', vi.fn(function () { return { observe: vi.fn(), disconnect: vi.fn() }; }));
    const fixture = TestBed.createComponent(EffectsHost);
    fixture.nativeElement.querySelector('section').animate = animate;
    fixture.detectChanges(); expect(animate).not.toHaveBeenCalled();
  });

  it('reveals once and disconnects its observer', () => {
    const callbacks: IntersectionObserverCallback[] = []; const disconnect = vi.fn(); const cancel = vi.fn();
    vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    vi.stubGlobal('IntersectionObserver', vi.fn(function (callback: IntersectionObserverCallback) { callbacks.push(callback); return { observe: vi.fn(), disconnect }; }));
    const fixture = TestBed.createComponent(EffectsHost); const animate = vi.fn(() => ({ cancel }));
    fixture.nativeElement.querySelector('section').animate = animate;
    fixture.detectChanges();
    callbacks[0]([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
    expect(animate).toHaveBeenCalledOnce(); expect(disconnect).toHaveBeenCalled();
    fixture.destroy(); expect(cancel).toHaveBeenCalled();
  });

  it('does not tilt an offscreen scene and cleans up listeners', () => {
    let observer: IntersectionObserverCallback | undefined;
    const disconnect = vi.fn();
    vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    vi.stubGlobal('IntersectionObserver', vi.fn(function (callback: IntersectionObserverCallback) { observer = callback; return { observe: vi.fn(), disconnect }; }));
    const fixture = TestBed.createComponent(EffectsHost); fixture.detectChanges();
    const scene: HTMLElement = fixture.nativeElement.querySelector('[ewMediaDepth]');
    scene.dispatchEvent(new MouseEvent('pointermove', { clientX: 20, clientY: 20 }));
    expect(scene.style.getPropertyValue('--tilt-x')).toBe('');
    observer!([{ isIntersecting: false } as IntersectionObserverEntry], {} as IntersectionObserver);
    fixture.destroy(); expect(disconnect).toHaveBeenCalled();
  });

  it('does not schedule JavaScript tilt frames on touch or reduced-motion scenes', () => {
    let observer: IntersectionObserverCallback | undefined;
    const requestFrame = vi.fn();
    vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    vi.stubGlobal('IntersectionObserver', vi.fn(function (callback: IntersectionObserverCallback) { observer = callback; return { observe: vi.fn(), disconnect: vi.fn() }; }));
    vi.stubGlobal('requestAnimationFrame', requestFrame);
    const fixture = TestBed.createComponent(EffectsHost); fixture.detectChanges();
    const scene: HTMLElement = fixture.nativeElement.querySelector('[ewMediaDepth]');
    observer!([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
    scene.dispatchEvent(new MouseEvent('pointermove', { clientX: 75, clientY: 25 }));
    expect(requestFrame).not.toHaveBeenCalled();
    expect(scene.style.getPropertyValue('--tilt-x')).toBe('');
    expect(scene.style.getPropertyValue('--tilt-y')).toBe('');
  });
  it('pauses CSS motion offscreen and in hidden tabs, then cleans up', () => {
    let observer: IntersectionObserverCallback | undefined;
    vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    vi.stubGlobal('IntersectionObserver', vi.fn(function (callback: IntersectionObserverCallback) { observer = callback; return { observe: vi.fn(), disconnect: vi.fn() }; }));
    const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
    const fixture = TestBed.createComponent(EffectsHost); fixture.detectChanges();
    const scene: HTMLElement = fixture.nativeElement.querySelector('[ewMediaDepth]');
    expect(scene.classList.contains('media-depth-active')).toBe(false);
    observer!([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
    expect(scene.classList.contains('media-depth-active')).toBe(true);
    hidden.mockReturnValue(true); document.dispatchEvent(new Event('visibilitychange'));
    expect(scene.classList.contains('media-depth-active')).toBe(false);
    hidden.mockReturnValue(false); document.dispatchEvent(new Event('visibilitychange'));
    expect(scene.classList.contains('media-depth-active')).toBe(true);
    observer!([{ isIntersecting: false } as IntersectionObserverEntry], {} as IntersectionObserver);
    expect(scene.classList.contains('media-depth-active')).toBe(false);
    fixture.destroy();
    document.dispatchEvent(new Event('visibilitychange'));
    expect(scene.classList.contains('media-depth-active')).toBe(false);
  });

  it('tilts a visible desktop media frame and resets it when it leaves view', () => {
    let observer: IntersectionObserverCallback | undefined;
    vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    vi.stubGlobal('IntersectionObserver', vi.fn(function (callback: IntersectionObserverCallback) { observer = callback; return { observe: vi.fn(), disconnect: vi.fn() }; }));
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { callback(0); return 1; });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    const fixture = TestBed.createComponent(EffectsHost); fixture.detectChanges();
    const scene: HTMLElement = fixture.nativeElement.querySelector('[ewMediaDepth]');
    vi.spyOn(scene, 'getBoundingClientRect').mockReturnValue({ top: 0, left: 0, width: 100, height: 100 } as DOMRect);
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
    observer!([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
    scene.dispatchEvent(new MouseEvent('pointermove', { clientX: 75, clientY: 25 }));
    expect(scene.style.getPropertyValue('--tilt-x')).toBe('1.75deg');
    expect(scene.style.getPropertyValue('--tilt-y')).toBe('2.25deg');
    observer!([{ isIntersecting: false } as IntersectionObserverEntry], {} as IntersectionObserver);
    expect(scene.style.getPropertyValue('--tilt-x')).toBe('');
  });
});
