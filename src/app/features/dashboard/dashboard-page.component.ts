import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { UserProfile } from '../../core/models/user.model';

@Component({
  selector: 'app-dashboard-page',
  imports: [RouterLink, MatButtonModule],
  template: `
    <section class="dashboard">
      <div class="dashboard-content">
        <p class="eyebrow">Your Openstay</p>
        <h1>Welcome, {{ profile()?.displayName || 'traveller' }}.</h1>
        @if (profile(); as traveller) {
          @if (traveller.city) {
            <p class="home-base">Based in {{ traveller.city }}</p>
          }
          @if (traveller.bio) {
            <p class="bio">{{ traveller.bio }}</p>
          }
        }
        <div class="actions">
          <a mat-flat-button routerLink="/explore">Explore Openstay</a>
          <a mat-stroked-button routerLink="/hosting">Start hosting</a>
          <button mat-stroked-button type="button" (click)="logOut()">Sign out</button>
        </div>
        @if (errorMessage()) {
          <p class="error" role="alert">{{ errorMessage() }}</p>
        }
      </div>
    </section>
  `,
  styles: `
    :host { display: block; min-height: calc(100vh - 76px); background: var(--openstay-cream); }
    .dashboard { display: grid; min-height: calc(100vh - 76px); place-items: center; padding: 48px 20px; }
    .dashboard-content { width: min(100%, 720px); padding: clamp(32px, 7vw, 64px); border: 1px solid var(--openstay-border); border-radius: 28px; background: var(--openstay-warm-white); box-shadow: var(--openstay-card-shadow); }
    .eyebrow { color: var(--openstay-forest); font-size: 12px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; }
    h1 { margin: 14px 0; font-size: clamp(38px, 7vw, 64px); line-height: 1.05; letter-spacing: -.04em; }
    .home-base, .bio { color: var(--openstay-muted); font-size: 18px; line-height: 1.6; }
    .actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 28px; }
    .actions a, .actions button { min-height: 48px; padding: 0 22px; border-radius: 999px; }
    .actions a { background: var(--openstay-forest); color: #fff; }
    .error { color: #a4262c; }
  `,
})
export class DashboardPageComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly profile = signal<UserProfile | null>(null);
  readonly errorMessage = signal('');

  constructor() {
    void this.loadProfile();
  }

  private async loadProfile(): Promise<void> {
    const user = this.auth.currentUser;
    if (!user) {
      await this.router.navigateByUrl('/auth/login');
      return;
    }
    try {
      this.profile.set(await this.auth.getProfile(user.uid));
    } catch (error) {
      this.errorMessage.set(this.auth.getErrorMessage(error));
    }
  }

  async logOut(): Promise<void> {
    try {
      await this.auth.logOut();
      await this.router.navigateByUrl('/');
    } catch (error) {
      this.errorMessage.set(this.auth.getErrorMessage(error));
    }
  }
}
