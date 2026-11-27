import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';
import { vi } from 'vitest';
import { ReplaySubject } from 'rxjs';
import { AuthService } from './core/auth/auth.service';
import { User } from '@angular/fire/auth';

describe('App', () => {
  let user$: ReplaySubject<User | null>;
  let logOut: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    user$ = new ReplaySubject<User | null>(1);
    logOut = vi.fn().mockImplementation(async () => user$.next(null));
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter(routes),
        {
          provide: AuthService,
          useValue: { user$, logOut, getErrorMessage: () => 'Could not sign out.' },
        },
      ],
    })
      .compileComponents();
    user$.next(null);
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

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(menuToggle.getAttribute('aria-expanded')).toBe('false');
    expect(navigation.classList.contains('mobile-open')).toBe(false);
    expect(fixture.nativeElement.querySelector('.nav-backdrop')).toBeNull();

    menuToggle.click();
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.nav-backdrop') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(menuToggle.getAttribute('aria-expanded')).toBe('false');
    expect(fixture.nativeElement.querySelector('.nav-backdrop')).toBeNull();
  });

  it('hides Join and Sign in while authenticated and restores them after sign out', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.signin-link')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.join-link')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.signout-link')).toBeNull();

    user$.next({ uid: 'signed-in-user' } as User);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.signin-link')).toBeNull();
    expect(fixture.nativeElement.querySelector('.join-link')).toBeNull();
    expect(fixture.nativeElement.querySelector('.signout-link')).toBeTruthy();

    user$.next(null);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.signin-link')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.join-link')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.signout-link')).toBeNull();
  });

  it('waits for the initial session state before showing authentication actions', () => {
    const pendingUser$ = new ReplaySubject<User | null>(1);
    TestBed.overrideProvider(AuthService, { useValue: { user$: pendingUser$ } });
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.signin-link')).toBeNull();
    expect(fixture.nativeElement.querySelector('.signout-link')).toBeNull();

    pendingUser$.next({ uid: 'restored-user' } as User);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.signout-link')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.signin-link')).toBeNull();
  });

  it('signs out from the shared navigation and leaves the protected page', async () => {
    user$.next({ uid: 'signed-in-user' } as User);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    fixture.componentInstance.toggleMobileNav();
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.signout-link') as HTMLButtonElement).click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(logOut).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledWith('/');
    expect(fixture.componentInstance.isMobileNavOpen()).toBe(false);
    expect(fixture.nativeElement.querySelector('.signin-link')).toBeTruthy();
  });

  it('shows a sign-out error and keeps the session when sign-out fails', async () => {
    user$.next({ uid: 'signed-in-user' } as User);
    logOut.mockRejectedValue(new Error('Sign-out failed'));
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.signout-link') as HTMLButtonElement).click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent)
      .toContain('Could not sign out.');
    expect(fixture.nativeElement.querySelector('.signout-link')).toBeTruthy();
    expect(navigate).not.toHaveBeenCalled();
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
