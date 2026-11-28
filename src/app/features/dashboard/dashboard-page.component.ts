import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { UserProfile } from '../../core/models/user.model';

@Component({
  selector: 'app-dashboard-page',
  imports: [RouterLink, MatButtonModule],
  templateUrl: './dashboard-page.component.html',
  styles: `
    :host { display: block; min-height: calc(100vh - 76px); background: var(--openstay-cream); }
    .dashboard { padding: clamp(32px, 5vw, 64px) 20px 72px; }
    .dashboard-content { width: min(100%, var(--openstay-content-width)); margin: auto; }
    .eyebrow { color: var(--openstay-forest); font-size: 12px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; }
    h1 { margin: 14px 0; font-size: clamp(38px, 7vw, 64px); line-height: 1.05; letter-spacing: -.04em; }
    .home-base, .bio { color: var(--openstay-muted); font-size: 18px; line-height: 1.6; }
    .dashboard-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin-top: 32px; }
    .dashboard-card, .trust-panel { padding: clamp(20px, 3vw, 30px); border: 1px solid var(--openstay-border); border-radius: var(--openstay-card-radius); background: var(--openstay-warm-white); box-shadow: var(--openstay-soft-shadow); }
    .dashboard-card h2, .trust-panel h2 { margin: 0 0 10px; font-size: 22px; }
    .dashboard-card p, .trust-panel p { color: var(--openstay-muted); line-height: 1.6; }
    .trust-panel { margin-top: 16px; }
    .trust-panel h3 { margin-bottom: 0; font-size: 16px; }
    .actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 20px; }
    .actions a, .actions button { min-height: 48px; padding: 0 22px; border-radius: 999px; }
    .actions a[mat-flat-button] { background: var(--openstay-forest); color: #fff; }
    .error { color: #a4262c; }
    @media (max-width: 640px) {
      .dashboard-grid { grid-template-columns: 1fr; }
      .actions { flex-direction: column; align-items: stretch; }
    }
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
