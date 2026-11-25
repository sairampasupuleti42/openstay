import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';
import { vi } from 'vitest';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes)],
    })
      .compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the Openstay shell', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.brand')?.textContent).toContain('Openstay');
  });

  it('keeps all primary links available in the collapsible mobile navigation', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const menuToggle = fixture.nativeElement.querySelector(
      '.mobile-menu-toggle',
    ) as HTMLButtonElement;
    expect(menuToggle.getAttribute('aria-expanded')).toBe('false');

    menuToggle.click();
    fixture.detectChanges();

    const navigation = fixture.nativeElement.querySelector(
      '#primary-navigation',
    ) as HTMLElement;
    expect(menuToggle.getAttribute('aria-expanded')).toBe('true');
    expect(navigation.classList.contains('mobile-open')).toBe(true);
    expect(navigation.textContent).toContain('Home');
    expect(navigation.textContent).toContain('Explore');
    expect(navigation.textContent).toContain('Sign in');
    expect(navigation.textContent).toContain('Join Openstay');
    expect(
      fixture.nativeElement.querySelector('.nav-backdrop'),
    ).toBeTruthy();

    (fixture.nativeElement.querySelector('.nav-backdrop') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(menuToggle.getAttribute('aria-expanded')).toBe('false');
    expect(navigation.classList.contains('mobile-open')).toBe(false);
    expect(fixture.nativeElement.querySelector('.nav-backdrop')).toBeNull();
  });

  it('should prompt supported browsers to install the app', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const prompt = vi.fn().mockResolvedValue(undefined);
    const installEvent = Object.assign(
      new Event('beforeinstallprompt', { cancelable: true }),
      {
        prompt,
        userChoice: Promise.resolve({ outcome: 'accepted', platform: 'web' }),
      },
    );
    window.dispatchEvent(installEvent);

    const installButton = fixture.nativeElement.querySelector(
      '.install-link',
    ) as HTMLButtonElement;
    installButton.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(prompt).toHaveBeenCalledOnce();
    expect(fixture.nativeElement.querySelector('[role="status"]')?.textContent)
      .toContain('being installed');
  });

  it('should explain how to install when the browser has no native prompt', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('.install-link') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="status"]')?.textContent)
      .toContain('Add to Home Screen');
  });
});
