import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { MediaDepthDirective } from './media-depth.directive';

@Component({ standalone: true, imports: [MediaDepthDirective], template: '<div class="media-stage" ewMediaDepth><button>Play</button></div>' })
class SensorHost {}

describe('optional hero device orientation', () => {
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
  function setup(permission?: () => Promise<string>) {
    vi.useFakeTimers();
    let visible!: IntersectionObserverCallback;
    let preferenceChanged!: () => void;
    const mobile = { matches: true, addEventListener: (_: string, callback: () => void) => { preferenceChanged = callback; }, removeEventListener: vi.fn() };
    vi.stubGlobal('matchMedia', (query: string) => query.includes('max-width') ? mobile : { matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() });
    vi.stubGlobal('IntersectionObserver', vi.fn(function (callback: IntersectionObserverCallback) { visible = callback; return { observe: vi.fn(), disconnect: vi.fn() }; }));
    vi.stubGlobal('isSecureContext', true);
    vi.stubGlobal('DeviceOrientationEvent', Object.assign(function () {}, { requestPermission: permission }));
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { callback(0); return 1; });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
    const fixture = TestBed.createComponent(SensorHost); fixture.detectChanges();
    const directive = fixture.debugElement.query(By.directive(MediaDepthDirective)).injector.get(MediaDepthDirective);
    const scene: HTMLElement = fixture.nativeElement.querySelector('.media-stage');
    vi.spyOn(scene, 'getBoundingClientRect').mockReturnValue({ width: 100, height: 100 } as DOMRect);
    const visibility = (isIntersecting: boolean) => visible([{ isIntersecting } as IntersectionObserverEntry], {} as IntersectionObserver);
    visibility(true);
    const reading = (beta: number | null, gamma: number | null) => window.dispatchEvent(Object.assign(new Event('deviceorientation'), { beta, gamma }));
    const touch = (type: string, x = 0, y = 0) => scene.dispatchEvent(Object.assign(new MouseEvent(type, { bubbles: true, clientX: x, clientY: y }), { pointerType: 'touch', pointerId: 1, isPrimary: true }));
    return { fixture, directive, scene, visibility, reading, touch, hidden, mobile, preferenceChanged: () => preferenceChanged() };
  }

  it('requests permission only when enabled, calibrates, dead-zones, smooths and bounds readings', async () => {
    const permission = vi.fn().mockResolvedValue('granted');
    const { directive, scene, reading, fixture } = setup(permission);
    expect(permission).not.toHaveBeenCalled();
    await directive.toggleMotion(); expect(permission).toHaveBeenCalledOnce();
    expect(directive.motionStatus()).toBe('waiting');
    reading(30, 10); reading(31, 11);
    expect(parseFloat(scene.style.getPropertyValue('--tilt-y'))).toBe(0);
    reading(30, 40);
    const first = parseFloat(scene.style.getPropertyValue('--tilt-y'));
    expect(first).toBeGreaterThan(0); expect(first).toBeLessThan(6);
    for (let i = 0; i < 100; i++) reading(150, 80);
    expect(Math.abs(parseFloat(scene.style.getPropertyValue('--tilt-x')))).toBeLessThanOrEqual(6);
    expect(Math.abs(parseFloat(scene.style.getPropertyValue('--tilt-y')))).toBeLessThanOrEqual(6);
    expect(directive.motionStatus()).toBe('on');
    fixture.destroy();
  });

  it.each(['denied', 'error'])('falls back when permission is %s', async outcome => {
    const permission = outcome === 'error' ? vi.fn().mockRejectedValue(new Error('Sensor unavailable')) : vi.fn().mockResolvedValue('denied');
    const { directive, scene, fixture } = setup(permission);
    await directive.toggleMotion();
    expect(directive.motionStatus()).toBe(outcome === 'denied' ? 'denied' : 'unavailable');
    expect(scene.classList.contains('media-gyro-active')).toBe(false);
    fixture.destroy();
  });

  it.each(['unsupported', 'insecure'])('retains touch when the sensor is %s', async reason => {
    const { directive, touch, scene, fixture } = setup();
    if (reason === 'unsupported') vi.stubGlobal('DeviceOrientationEvent', undefined);
    else vi.stubGlobal('isSecureContext', false);
    await directive.toggleMotion(); expect(directive.motionStatus()).toBe('unsupported');
    touch('pointerdown'); expect(scene.classList.contains('media-touch-active')).toBe(true);
    fixture.destroy();
  });

  it('falls back after missing or invalid readings without freezing idle motion', async () => {
    const { directive, reading, scene, fixture } = setup();
    await directive.toggleMotion(); reading(null, null); reading(NaN, Infinity);
    expect(directive.motionStatus()).toBe('waiting');
    vi.advanceTimersByTime(5350);
    expect(directive.motionStatus()).toBe('unavailable');
    expect(scene.classList.contains('media-touch-active')).toBe(false);
    fixture.destroy();
  });

  it('gives touch priority, then returns to the latest gyro reading', async () => {
    const { directive, reading, scene, touch, fixture } = setup();
    await directive.toggleMotion(); reading(30, 10); reading(30, 25);
    touch('pointerdown'); touch('pointermove', 20, -10);
    const dragged = scene.style.getPropertyValue('--tilt-y');
    reading(30, -20); expect(scene.style.getPropertyValue('--tilt-y')).toBe(dragged);
    touch('pointerup'); expect(scene.style.getPropertyValue('--tilt-y')).not.toBe(dragged);
    vi.advanceTimersByTime(350);
    expect(scene.classList.contains('media-touch-active')).toBe(false);
    expect(scene.classList.contains('media-gyro-active')).toBe(true);
    fixture.destroy();
  });

  it('suspends listeners offscreen, in hidden tabs, during playback, and on disable', async () => {
    const remove = vi.spyOn(window, 'removeEventListener');
    const { directive, reading, scene, visibility, hidden, fixture } = setup();
    await directive.toggleMotion(); reading(30, 0); reading(30, 20);
    visibility(false); expect(remove).toHaveBeenCalledWith('deviceorientation', expect.any(Function));
    reading(30, 40); expect(scene.style.getPropertyValue('--tilt-y')).toBe('');
    vi.advanceTimersByTime(10000); expect(directive.motionStatus()).not.toBe('unavailable');
    visibility(true); reading(30, 40); expect(parseFloat(scene.style.getPropertyValue('--tilt-y'))).toBe(0);
    hidden.mockReturnValue(true); document.dispatchEvent(new Event('visibilitychange'));
    expect(scene.classList.contains('media-gyro-active')).toBe(false);
    hidden.mockReturnValue(false); document.dispatchEvent(new Event('visibilitychange'));
    directive.ewMediaPlaying = true; reading(30, 60);
    expect(scene.classList.contains('media-gyro-active')).toBe(false);
    directive.ewMediaPlaying = false; reading(30, 60);
    await directive.toggleMotion(); expect(directive.motionStatus()).toBe('off');
    fixture.destroy(); vi.runAllTimers();
  });

  it('disables sensor motion when reduced motion or a desktop breakpoint takes effect', async () => {
    const { directive, mobile, preferenceChanged, fixture } = setup();
    await directive.toggleMotion(); mobile.matches = false; preferenceChanged();
    expect(directive.motionAllowed()).toBe(false); expect(directive.motionStatus()).toBe('off');
    await directive.toggleMotion(); expect(directive.motionStatus()).toBe('off');
    fixture.destroy();
  });

  it('does not attach a late permission result after destruction', async () => {
    let grant!: (value: string) => void;
    const { directive, fixture } = setup(() => new Promise(resolve => { grant = resolve; }));
    const add = vi.spyOn(window, 'addEventListener');
    const pending = directive.toggleMotion(); fixture.destroy(); grant('granted'); await pending;
    expect(add.mock.calls.some(([type]) => type === 'deviceorientation')).toBe(false);
  });

  it('recalibrates when screen orientation changes', async () => {
    const orientation = { angle: 0 }; vi.stubGlobal('screen', { orientation });
    const { directive, reading, scene, fixture } = setup();
    await directive.toggleMotion(); reading(30, 0); orientation.angle = 90; reading(30, 0); reading(30, 20);
    expect(parseFloat(scene.style.getPropertyValue('--tilt-x'))).toBeGreaterThan(0);
    expect(Math.abs(parseFloat(scene.style.getPropertyValue('--tilt-y')))).toBeLessThan(.01);
    fixture.destroy();
  });
});
