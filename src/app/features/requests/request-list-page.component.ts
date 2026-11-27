import { Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HostingRequest } from '../../core/models/hosting-request.model';
import { HostingRequestService } from '../../core/services/hosting-request.service';

@Component({
  selector: 'app-request-list-page',
  imports: [MatButtonModule, RouterLink],
  templateUrl: './request-list-page.component.html',
  styles: `
    :host { display: block; background: var(--openstay-cream); min-height: 80vh; }
    .page { max-width: 900px; margin: auto; padding: 40px 20px; }
    .card { padding: 24px; margin: 16px 0; border-radius: 20px; background: var(--openstay-warm-white); }
    .error { color: #a4262c; }
  `,
})
export class RequestListPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(HostingRequestService);
  readonly kind = this.route.snapshot.data['kind'] === 'incoming' ? 'incoming' : 'mine';
  readonly items = signal<HostingRequest[]>([]);
  readonly cursor = signal<string | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');

  ngOnInit(): void { void this.load(); }

  async load(more = false): Promise<void> {
    if (this.loading() || (more && !this.cursor())) return;
    this.loading.set(true);
    this.error.set('');
    try {
      const page = await this.service.list(this.kind, more ? this.cursor() : null);
      this.items.set(more ? [...this.items(), ...page.items] : page.items);
      this.cursor.set(page.nextCursor);
    } catch (error) {
      this.error.set(this.service.errorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }
}
