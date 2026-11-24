import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';

@Component({
  selector: 'app-auth-page',
  imports: [
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  template: `
    <section class="auth-page">
      <div class="auth-panel">
        <a class="auth-brand" routerLink="/" aria-label="Openstay home">
          <span>Openstay</span>
        </a>
        <p class="eyebrow">{{ isRegister() ? 'Join the community' : 'Welcome back' }}</p>
        <h1>{{ isRegister() ? 'Create your account' : 'Sign in to Openstay' }}</h1>
        <p class="intro">
          {{ isRegister()
            ? 'Start meeting local hosts and sharing meaningful travel experiences.'
            : 'Continue planning meaningful stays and connecting with hosts.' }}
        </p>
        <form class="auth-form" action="#">
          @if (isRegister()) {
            <mat-form-field appearance="outline">
              <mat-label>Full name</mat-label>
              <input matInput name="name" autocomplete="name" />
            </mat-form-field>
          }
          <mat-form-field appearance="outline">
            <mat-label>Email address</mat-label>
            <input matInput name="email" type="email" autocomplete="email" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Password</mat-label>
            <input matInput name="password" type="password" autocomplete="current-password" />
          </mat-form-field>
          <button mat-flat-button type="submit" class="submit-button">
            {{ isRegister() ? 'Create account' : 'Sign in' }}
          </button>
        </form>
        <p class="switch-mode">
          {{ isRegister() ? 'Already have an account?' : 'New to Openstay?' }}
          <a [routerLink]="isRegister() ? '/auth/login' : '/auth/register'">
            {{ isRegister() ? 'Sign in' : 'Join Openstay' }}
          </a>
        </p>
      </div>
    </section>
  `,
  styles: `
    :host { display: block; min-height: calc(100vh - 76px); background: var(--openstay-cream); }
    .auth-page { min-height: calc(100vh - 76px); display: grid; place-items: center; padding: 48px 20px; }
    .auth-panel { width: min(100%, 460px); padding: clamp(28px, 5vw, 44px); border: 1px solid var(--openstay-border); border-radius: 28px; background: var(--openstay-warm-white); box-shadow: var(--openstay-card-shadow); }
    .auth-brand { display: inline-flex; margin-bottom: 36px; color: var(--openstay-forest); font-size: 22px; font-weight: 800; text-decoration: none; }
    .eyebrow { margin: 0 0 10px; color: var(--openstay-forest); font-size: 12px; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; }
    h1 { margin: 0 0 12px; font-size: clamp(32px, 6vw, 44px); line-height: 1.08; letter-spacing: -0.03em; }
    .intro { margin: 0 0 28px; color: var(--openstay-muted); line-height: 1.6; }
    .auth-form { display: grid; gap: 6px; }
    .auth-form mat-form-field { width: 100%; }
    .submit-button { height: 48px; border-radius: 999px; background: var(--openstay-forest); color: #fff; }
    .switch-mode { margin: 24px 0 0; text-align: center; color: var(--openstay-muted); }
    .switch-mode a { color: var(--openstay-forest); font-weight: 800; }
  `,
})
export class AuthPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly mode = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('mode') ?? 'login')),
    { initialValue: 'login' },
  );

  readonly isRegister = computed(() => this.mode() === 'register');
}
