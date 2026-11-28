import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PublicListingSummary } from '../../../core/models/listing.model';

@Component({
  selector: 'app-public-listing-card',
  imports: [RouterLink],
  templateUrl: './public-listing-card.component.html',
  styles: `
    :host { display: block; }
    .card { display: block; height: 100%; overflow: hidden; border: 1px solid var(--openstay-border); border-radius: var(--openstay-card-radius); background: var(--openstay-warm-white); box-shadow: var(--openstay-soft-shadow); color: inherit; text-decoration: none; transition: transform 140ms ease, box-shadow 140ms ease; }
    .card:hover { transform: translateY(-2px); box-shadow: var(--openstay-card-shadow); }
    .card:focus-visible { outline: 3px solid var(--openstay-forest); outline-offset: 3px; }
    .card-art { display: grid; min-height: 150px; place-items: center; background: linear-gradient(145deg, var(--openstay-sage), var(--openstay-cream)); color: var(--openstay-forest); }
    .card-art span { display: grid; width: 64px; height: 64px; place-items: center; border-radius: 50%; background: rgba(255, 255, 255, .7); font-size: 32px; }
    .card-content { display: grid; align-content: start; gap: 12px; padding: 22px; }
    .location, .type, .capacity { color: var(--openstay-muted); }
    .location { margin: 0; font-size: 13px; font-weight: 700; }
    h2 { margin: 0; font-size: 21px; line-height: 1.25; }
    .facts { display: flex; flex-wrap: wrap; gap: 8px; }
    .type, .capacity { padding: 6px 10px; border-radius: 999px; background: var(--openstay-cream); font-size: 13px; }
    @media (prefers-reduced-motion: reduce) {
      .card { transition: none; }
      .card:hover { transform: none; }
    }
  `,
})
export class PublicListingCardComponent {
  readonly listing = input.required<PublicListingSummary>();

  accommodationLabel(value: string): string {
    return value.replaceAll('_', ' ');
  }
}
