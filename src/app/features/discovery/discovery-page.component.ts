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
      <p>Structured host discovery will be added in the next implementation phase.</p>
      <a mat-flat-button routerLink="/">Back home</a>
    </section>
  `,
  styles: `
    .discovery { max-width: 760px; margin: 0 auto; padding: 96px 24px; text-align: center; }
    .eyebrow { color: #398b65; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; }
    h1 { margin: 12px 0 20px; font-family: Georgia, serif; font-size: clamp(42px, 7vw, 72px); }
    p { margin: 0 auto 28px; color: #607066; line-height: 1.7; }
  `,
})
export class DiscoveryPageComponent {}
