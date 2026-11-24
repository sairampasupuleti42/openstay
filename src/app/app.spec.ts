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
