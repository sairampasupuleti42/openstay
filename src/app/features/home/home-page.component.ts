import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home-page',
  imports: [RouterLink, MatButtonModule],
  template: `
    <section class="hero">
      <div class="hero-copy">
        <p class="eyebrow">Community hosting, not hotel booking</p>
        <h1>Stay local.<br /><span>Connect globally.</span></h1>
        <p class="lede">
          Discover welcoming hosts, share cultures, and build meaningful travel
          connections without accommodation fees.
        </p>
        <div class="actions">
          <a mat-flat-button routerLink="/explore">Explore hosts</a>
          <a mat-stroked-button routerLink="/auth/register">Become a host</a>
        </div>
      </div>
      <div class="community-card" aria-label="Openstay community values">
        <div class="card-orbit orbit-one"></div>
        <div class="card-orbit orbit-two"></div>
        <div class="card-content">
          <span class="card-label">One community</span>
          <strong>Many local stories</strong>
          <div class="card-stat">
            <span>Free stays</span>
            <span>Real connections</span>
          </div>
        </div>
      </div>
    </section>
    <section class="principles" aria-labelledby="principles-heading">
      <h2 id="principles-heading">Built around people</h2>
      <div class="principle-grid">
        <article><strong>01</strong><h3>Meet local hosts</h3><p>Travel through the people who know a place best.</p></article>
        <article><strong>02</strong><h3>Share cultures</h3><p>Exchange stories, perspectives, and everyday life.</p></article>
        <article><strong>03</strong><h3>Host freely</h3><p>No accommodation payments or booking commissions.</p></article>
      </div>
    </section>
  `,
  styleUrl: './home-page.component.scss',
})
export class HomePageComponent {}
