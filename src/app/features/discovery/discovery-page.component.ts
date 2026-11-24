import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-discovery-page',
  imports: [RouterLink, MatButtonModule],
  template: `
    <section class="discovery">
      <p class="eyebrow">Explore</p>
      <h1>Find a place to belong</h1>
      <p class="intro">Search by destination and find people who can make your trip feel local.</p>
      <form class="search-panel" action="#">
        <label>
          <span>Destination</span>
          <input name="destination" type="search" placeholder="City or region" />
        </label>
        <button mat-flat-button type="button">Search hosts</button>
      </form>
      <div class="empty-state" role="status">
        <span class="empty-icon" aria-hidden="true">⌂</span>
        <h2>Your next host is closer than you think</h2>
        <p>Host discovery is coming in the next implementation phase. In the meantime, explore the Openstay community story.</p>
        <a mat-stroked-button routerLink="/">Back home</a>
      </div>
    </section>
  `,
  styles: `
    :host { display: block; min-height: calc(100vh - 76px); background: linear-gradient(145deg, var(--openstay-warm-white), var(--openstay-cream)); }
    .discovery { max-width: 980px; margin: 0 auto; padding: clamp(64px, 10vw, 112px) 24px; text-align: center; }
    .eyebrow { color: var(--openstay-forest); font-weight: 800; letter-spacing: 0.16em; text-transform: uppercase; }
    h1 { margin: 14px 0 16px; font-family: Roboto, system-ui, sans-serif; font-size: clamp(44px, 7vw, 72px); font-weight: 700; line-height: 1.02; }
    .intro { max-width: 620px; margin: 0 auto 32px; color: var(--openstay-muted); line-height: 1.7; }
    .search-panel { display: grid; grid-template-columns: 1fr auto; gap: 12px; max-width: 720px; margin: 0 auto 24px; padding: 10px; border: 1px solid var(--openstay-border); border-radius: 18px; background: var(--openstay-warm-white); box-shadow: var(--openstay-soft-shadow); text-align: left; }
    .search-panel label { display: grid; gap: 3px; padding: 4px 10px; }
    .search-panel label span { color: var(--openstay-forest); font-size: 12px; font-weight: 800; }
    .search-panel input { width: 100%; border: 0; outline: 0; background: transparent; color: var(--openstay-charcoal); font-size: 16px; }
    .search-panel input::placeholder { color: #89958e; }
    .search-panel button { height: 52px; border-radius: 12px; background: var(--openstay-forest); color: #fff; }
    .empty-state { max-width: 720px; margin: 0 auto; padding: 40px 28px; border: 1px solid var(--openstay-border); border-radius: var(--openstay-card-radius); background: rgba(255,255,255,0.68); }
    .empty-icon { display: grid; width: 64px; height: 64px; margin: 0 auto 18px; place-items: center; border-radius: 50%; background: var(--openstay-sage); color: var(--openstay-forest); font-size: 28px; }
    .empty-state h2 { margin: 0 0 10px; font-size: clamp(24px, 4vw, 34px); }
    .empty-state p { max-width: 560px; margin: 0 auto 24px; color: var(--openstay-muted); line-height: 1.7; }
    .empty-state a { height: 44px; border-radius: 999px; color: var(--openstay-forest); }
    @media (max-width: 560px) {
      .discovery { padding-left: 16px; padding-right: 16px; }
      .search-panel { grid-template-columns: 1fr; }
      .search-panel button { width: 100%; }
      .empty-state { padding: 32px 20px; }
    }
  `,
})
export class DiscoveryPageComponent {}
