import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { Router } from '@angular/router';

@Component({
  selector: 'app-home-page',
  imports: [FormsModule, MatButtonModule],
  template: `
    <section class="hero" aria-labelledby="welcome-heading">
      <div class="hero-copy">
        <p class="hello"><span aria-hidden="true">✦</span> Hello, traveler</p>
        <p class="eyebrow">Travel better, together</p>
        <h1 id="welcome-heading">Where shall we <span>go next?</span></h1>
        <p class="lede">
          Find your next destination — and the kind people who make it feel like
          home. Openstay brings travelers and local hosts together, one
          meaningful stay at a time.
        </p>

        <form
          class="destination-search"
          (ngSubmit)="search()"
          aria-label="Find a destination"
        >
          <label for="destination">Your next destination</label>
          <div class="search-control">
            <span class="location-mark" aria-hidden="true">⌖</span>
            <input
              id="destination"
              name="destination"
              type="search"
              [(ngModel)]="destination"
              placeholder="City, country, or just a feeling"
              autocomplete="off"
            />
            <button mat-flat-button type="submit">Explore</button>
          </div>
        </form>

        <div class="suggestions" aria-label="Destination suggestions">
          <span>Need a spark?</span>
          <button type="button" (click)="chooseDestination('Lisbon')">
            Lisbon
          </button>
          <button type="button" (click)="chooseDestination('Kyoto')">
            Kyoto
          </button>
          <button type="button" (click)="chooseDestination('Mexico City')">
            Mexico City
          </button>
        </div>
      </div>

      <aside
        class="inspiration-card"
        aria-label="The Openstay travel community"
      >
        <div class="card-sky">
          <span class="sun" aria-hidden="true"></span>
          <span class="hill hill-back" aria-hidden="true"></span>
          <span class="hill hill-front" aria-hidden="true"></span>
          <span class="path" aria-hidden="true"></span>
          <span class="card-tag"
            ><span aria-hidden="true">✦</span> The local way</span
          >
          <div class="postcard-note">
            <span>Less itinerary.</span>
            <strong>More belonging.</strong>
          </div>
        </div>
        <div class="card-caption">
          <div>
            <span class="card-kicker">A different kind of travel</span>
            <h2>Come as a guest.<br />Leave as a friend.</h2>
          </div>
          <div class="community-mark" aria-hidden="true">
            <span>O</span><span>+</span><span>∞</span>
          </div>
        </div>
        <div class="card-footer">
          <span>Local stays</span>
          <span>Real connections</span>
          <span>Always people-first</span>
        </div>
      </aside>
    </section>

    <section class="principles" aria-labelledby="principles-heading">
      <div class="section-heading">
        <p class="eyebrow">More than a place to stay</p>
        <h2 id="principles-heading">Make room for connection.</h2>
        <p>
          Travel feels different when you experience it with the people who call
          it home.
        </p>
      </div>
      <div class="principle-grid">
        <article>
          <span class="principle-number">01</span>
          <h3>Meet local hosts</h3>
          <p>Get to know a place through the people who know it best.</p>
        </article>
        <article>
          <span class="principle-number">02</span>
          <h3>Share your world</h3>
          <p>
            Trade stories, perspectives, and the little things that make us
            different.
          </p>
        </article>
        <article>
          <span class="principle-number">03</span>
          <h3>Travel generously</h3>
          <p>Build a community around hospitality, not accommodation fees.</p>
        </article>
      </div>
    </section>
  `,
  styleUrl: './home-page.component.scss',
})
export class HomePageComponent {
  private readonly router = inject(Router);
  destination = '';

  chooseDestination(destination: string): void {
    this.destination = destination;
  }

  search(): void {
    const destination = this.destination.trim();
    void this.router.navigate(['/explore'], {
      queryParams: destination ? { destination } : {},
    });
  }
}
