import { AsyncPipe } from '@angular/common';
import { Component, HostListener, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from './core/auth/auth.service';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

@Component({
  imports: [
    AsyncPipe,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatButtonModule,
    MatToolbarModule,
  ],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly session$ = this.auth.user$.pipe(map((user) => ({ user })));
  readonly isInstalled = signal(this.isRunningStandalone());
  readonly isMobileNavOpen = signal(false);
  readonly isSigningOut = signal(false);
  readonly signOutError = signal('');
  installMessage = '';
  private installPrompt: BeforeInstallPromptEvent | null = null;

  toggleMobileNav(): void {
    this.isMobileNavOpen.update((isOpen) => !isOpen);
  }

  closeMobileNav(): void {
    this.isMobileNavOpen.set(false);
  }

  async signOut(): Promise<void> {
    if (this.isSigningOut()) return;
    this.isSigningOut.set(true);
    this.signOutError.set('');
    try {
      await this.auth.logOut();
      this.closeMobileNav();
      await this.router.navigateByUrl('/');
    } catch (error) {
      this.signOutError.set(this.auth.getErrorMessage(error));
    } finally {
      this.isSigningOut.set(false);
    }
  }

  @HostListener('document:keydown', ['$event'])
  closeMobileNavOnEscape(event: KeyboardEvent): void {
    if (event.key === 'Escape') this.closeMobileNav();
  }

  @HostListener('window:beforeinstallprompt', ['$event'])
  captureInstallPrompt(event: Event): void {
    if (this.isInstalled()) return;
    event.preventDefault();
    this.installPrompt = event as BeforeInstallPromptEvent;
  }

  @HostListener('window:appinstalled')
  markAsInstalled(): void {
    this.installPrompt = null;
    this.isInstalled.set(true);
    this.installMessage = 'Openstay is installed.';
  }

  async installApp(): Promise<void> {
    this.closeMobileNav();
    this.installMessage = '';
    const prompt = this.installPrompt;

    if (!prompt) {
      this.installMessage =
        'Use your browser’s Share menu and choose “Add to Home Screen” on iPhone, or choose “Install app” from your browser menu.';
      return;
    }

    this.installPrompt = null;
    try {
      await prompt.prompt();
      const { outcome } = await prompt.userChoice;
      if (outcome === 'accepted') this.installMessage = 'Openstay is being installed.';
      else this.installMessage = 'Installation was canceled.';
    } catch (error) {
      console.error('Could not open the Openstay installation prompt.', error);
      this.installMessage =
        'Openstay could not be installed. Try the install option in your browser menu.';
    }
  }

  private isRunningStandalone(): boolean {
    const displayMode = typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia('(display-mode: standalone)').matches;
    const safariStandalone = typeof navigator !== 'undefined'
      && 'standalone' in navigator
      && (navigator as Navigator & { standalone?: boolean }).standalone === true;
    return displayMode || safariStandalone;
  }
}
