import { AfterViewInit, Directive, ElementRef, Input, NgZone, OnDestroy, inject, signal } from '@angular/core';

/** A single frame per pointer update on visible scenes. No render loop. */
@Directive({ selector: '[ewMediaDepth]', standalone: true, exportAs: 'mediaDepth' })
export class MediaDepthDirective implements AfterViewInit, OnDestroy {
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly zone = inject(NgZone);
  readonly motionStatus = signal<'off' | 'permission' | 'waiting' | 'on' | 'unsupported' | 'denied' | 'unavailable'>('off');
  readonly motionAllowed = signal(false);
  private motionEnabled = false;
  private destroyed = false;
  private permissionAttempt = 0;
  private playing = false;
  private sensorListening = false;
  private sensorTimer?: ReturnType<typeof setTimeout>;
  private lastReading = 0;
  private baseline?: { beta: number; gamma: number; angle: number };
  private sensorTilt?: { x: number; y: number };
  @Input() set ewMediaPlaying(value: boolean) {
    this.playing = value;
    if (value) { this.endTouch(); this.reset(); }
    this.syncSensor();
  }
  async toggleMotion(): Promise<void> {
    if (this.motionEnabled) { this.disableMotion(); return; }
    if (!this.motionAllowed() || this.destroyed || this.motionStatus() === 'permission') return;
    const orientation = window.DeviceOrientationEvent as typeof DeviceOrientationEvent & { requestPermission?: () => Promise<string> };
    if (!window.isSecureContext || !orientation) { this.motionStatus.set('unsupported'); return; }
    const attempt = ++this.permissionAttempt;
    this.motionStatus.set('permission');
    try {
      // Called synchronously from the button gesture, before any await/import.
      const permission = orientation.requestPermission ? await orientation.requestPermission() : 'granted';
      if (this.destroyed || attempt !== this.permissionAttempt || !this.motionAllowed()) return;
      if (permission !== 'granted') { this.motionStatus.set('denied'); return; }
      this.motionEnabled = true;
      this.motionStatus.set('waiting');
      this.syncSensor();
    } catch {
      if (!this.destroyed && attempt === this.permissionAttempt) this.disableMotion('unavailable');
    }
  }
  private disableMotion(status: 'off' | 'unavailable' = 'off'): void {
    ++this.permissionAttempt;
    this.motionEnabled = false;
    this.syncSensor();
    this.motionStatus.set(status);
    if (!this.drag) { this.reset(); this.settleTouch(); }
  }
  private canUseSensor(): boolean {
    return this.motionEnabled && !!this.touchPreference?.matches && this.visible && !document.hidden &&
      !this.playing && !this.element.classList.contains('hero-playing');
  }
  private syncSensor(): void {
    const active = this.canUseSensor();
    if (active === this.sensorListening) return;
    this.sensorListening = active;
    this.baseline = undefined;
    this.sensorTilt = undefined;
    clearTimeout(this.sensorTimer); this.sensorTimer = undefined;
    this.element.classList.remove('media-gyro-active');
    if (active) {
      this.motionStatus.set('waiting');
      this.lastReading = Date.now();
      this.zone.runOutsideAngular(() => {
        window.addEventListener('deviceorientation', this.readOrientation, { passive: true });
        this.watchSensor();
      });
    } else {
      window.removeEventListener('deviceorientation', this.readOrientation);
    }
  }
  private watchSensor(): void {
    this.sensorTimer = setTimeout(() => {
      const remaining = 5000 - (Date.now() - this.lastReading);
      if (remaining <= 0) this.disableMotion('unavailable');
      else this.watchSensor();
    }, 5000);
  }
  private readonly readOrientation = (event: DeviceOrientationEvent) => {
    if (!this.canUseSensor()) return;
    if (event.beta === null || event.gamma === null || !Number.isFinite(event.beta) || !Number.isFinite(event.gamma)) return;
    this.lastReading = Date.now();
    const angle = screen.orientation?.angle ?? (window as Window & { orientation?: number }).orientation ?? 0;
    if (!this.baseline || this.baseline.angle !== angle) {
      this.baseline = { beta: event.beta, gamma: event.gamma, angle };
      this.sensorTilt = { x: 0, y: 0 };
    }
    const delta = (value: number, base: number) => ((value - base + 540) % 360) - 180;
    const beta = delta(event.beta, this.baseline.beta), gamma = delta(event.gamma, this.baseline.gamma);
    const radians = angle * Math.PI / 180;
    const bounded = (value: number) => Math.max(-6, Math.min(6, Math.sign(value) * Math.max(0, Math.abs(value) - 1.5) * .3));
    const targetX = bounded(-beta * Math.cos(radians) + gamma * Math.sin(radians));
    const targetY = bounded(gamma * Math.cos(radians) + beta * Math.sin(radians));
    const previous = this.sensorTilt!;
    this.sensorTilt = { x: previous.x + (targetX - previous.x) * .18, y: previous.y + (targetY - previous.y) * .18 };
    this.motionStatus.set('on');
    this.element.classList.add('media-gyro-active');
    if (this.drag || this.element.classList.contains('media-touch-active')) return;
    cancelAnimationFrame(this.frame);
    this.frame = requestAnimationFrame(() => {
      if (this.canUseSensor() && !this.drag) this.applySensorTilt();
    });
  };
  private applySensorTilt(): void {
    if (!this.sensorTilt) return;
    this.element.style.setProperty('--tilt-x', `${this.sensorTilt.x}deg`);
    this.element.style.setProperty('--tilt-y', `${this.sensorTilt.y}deg`);
  }
  private settleTouch(): void {
    this.element.classList.add('media-touch-active');
    clearTimeout(this.returnTimer);
    this.returnTimer = setTimeout(() => {
      if (this.canUseSensor()) this.applySensorTilt();
      this.element.classList.remove('media-touch-active');
    }, 350);
  }
  private observer?: IntersectionObserver;
  private preference?: MediaQueryList;
  private touchPreference?: MediaQueryList;
  private drag?: { id: number; x: number; y: number; tiltX: number; tiltY: number };
  private returnTimer?: ReturnType<typeof setTimeout>;
  private visible = false;
  private readonly beginTouch = (event: PointerEvent) => {
    if (event.pointerType !== 'touch' || !event.isPrimary || this.drag || !this.touchPreference?.matches ||
        !this.visible || document.hidden || !this.element.classList.contains('media-stage') ||
        this.element.classList.contains('hero-playing') ||
        (event.target instanceof Element && event.target.closest('a, button, input, select, textarea, iframe, video, [role="button"]'))) return;
    clearTimeout(this.returnTimer);
    const style = getComputedStyle(this.element);
    this.drag = { id: event.pointerId, x: event.clientX, y: event.clientY,
      tiltX: parseFloat(style.getPropertyValue('--tilt-x')) || 0, tiltY: parseFloat(style.getPropertyValue('--tilt-y')) || 0 };
    this.element.classList.add('media-touch-active', 'media-touch-dragging');
    this.element.setPointerCapture?.(event.pointerId);
  };
  private readonly endTouch = (event?: PointerEvent) => {
    if (!this.drag || (event && event.pointerId !== this.drag.id)) return;
    const id = this.drag.id;
    this.drag = undefined;
    this.element.classList.remove('media-touch-dragging');
    if (this.element.hasPointerCapture?.(id)) this.element.releasePointerCapture(id);
    this.reset();
    if (this.canUseSensor()) this.applySensorTilt();
    // Preserve the paused CSS animation phase while the tilt returns to neutral.
    this.settleTouch();
  };
  private readonly leave = () => { if (!this.drag && !this.motionEnabled) this.reset(); };
  private readonly preferencesChanged = () => {
    this.motionAllowed.set(!!this.touchPreference?.matches);
    if (!this.motionAllowed()) this.disableMotion();
    this.endTouch(); this.reset();
  };
  private frame = 0;
  private readonly syncVisibility = () => {
    this.element.classList.toggle('media-depth-active', this.visible && !document.hidden);
    if (!this.visible || document.hidden) this.endTouch();
    this.reset();
    this.syncSensor();
  };
  private readonly reset = () => {
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.element.style.removeProperty('--tilt-x');
    this.element.style.removeProperty('--tilt-y');
  };
  private readonly move = (event: PointerEvent) => {
    if (this.drag && event.pointerId === this.drag.id) {
      if (!this.visible || document.hidden || !this.touchPreference?.matches || this.element.classList.contains('hero-playing')) { this.endTouch(); return; }
      const drag = this.drag;
      cancelAnimationFrame(this.frame);
      this.frame = requestAnimationFrame(() => {
        const rect = this.element.getBoundingClientRect();
        const clamp = (value: number) => Math.max(-6, Math.min(6, value));
        this.element.style.setProperty('--tilt-x', `${clamp(drag.tiltX + (event.clientY - drag.y) / rect.height * -18)}deg`);
        this.element.style.setProperty('--tilt-y', `${clamp(drag.tiltY + (event.clientX - drag.x) / rect.width * 18)}deg`);
      });
      return;
    }
    if (event.pointerType === 'touch' || !this.visible || !this.preference?.matches || document.hidden) return;
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
    this.touchPreference = window.matchMedia('(max-width: 1023px) and (prefers-reduced-motion: no-preference)');
    this.motionAllowed.set(this.touchPreference.matches);
    this.preference.addEventListener('change', this.preferencesChanged);
    this.touchPreference.addEventListener('change', this.preferencesChanged);
    this.observer = new IntersectionObserver(entries => {
      this.visible = entries.some(entry => entry.isIntersecting);
      this.syncVisibility();
    });
    this.observer.observe(this.element);
    this.element.addEventListener('pointermove', this.move, { passive: true });
    this.element.addEventListener('pointerleave', this.leave);
    this.element.addEventListener('pointerdown', this.beginTouch, { passive: true });
    this.element.addEventListener('pointerup', this.endTouch);
    this.element.addEventListener('pointercancel', this.endTouch);
    this.element.addEventListener('lostpointercapture', this.endTouch);
    document.addEventListener('visibilitychange', this.syncVisibility);
  }
  ngOnDestroy(): void {
    this.destroyed = true;
    this.disableMotion();
    this.endTouch();
    clearTimeout(this.returnTimer);
    this.element.classList.remove('media-depth-active', 'media-touch-active', 'media-touch-dragging');
    this.reset(); this.observer?.disconnect();
    this.preference?.removeEventListener('change', this.preferencesChanged);
    this.touchPreference?.removeEventListener('change', this.preferencesChanged);
    this.element.removeEventListener('pointermove', this.move);
    this.element.removeEventListener('pointerleave', this.leave);
    this.element.removeEventListener('pointerdown', this.beginTouch);
    this.element.removeEventListener('pointerup', this.endTouch);
    this.element.removeEventListener('pointercancel', this.endTouch);
    this.element.removeEventListener('lostpointercapture', this.endTouch);
    document.removeEventListener('visibilitychange', this.syncVisibility);
  }
}
