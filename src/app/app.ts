import { Component, HostListener, signal } from '@angular/core';
import { RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterLink } from '@angular/router';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

@Component({
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatButtonModule, MatToolbarModule],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  readonly isInstalled = signal(this.isRunningStandalone());
  readonly isMobileNavOpen = signal(false);
  installMessage = '';
  private installPrompt: BeforeInstallPromptEvent | null = null;

  toggleMobileNav(): void {
    this.isMobileNavOpen.update((isOpen) => !isOpen);
  }

  closeMobileNav(): void {
    this.isMobileNavOpen.set(false);
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
