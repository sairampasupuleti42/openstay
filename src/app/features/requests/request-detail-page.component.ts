import { Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HostingRequestDetails } from '../../core/models/hosting-request.model';
import { HostingRequestService } from '../../core/services/hosting-request.service';

@Component({
  selector: 'app-request-detail-page',
  imports: [MatButtonModule, RouterLink],
  templateUrl: './request-detail-page.component.html',
  styles: `
    :host { display: block; background: var(--openstay-cream); min-height: 80vh; }
    .page { max-width: 720px; margin: auto; padding: 40px 20px; }
    .panel { padding: 28px; border-radius: 22px; background: var(--openstay-warm-white); }
    .message { white-space: pre-wrap; overflow-wrap: anywhere; }
    .error { color: #a4262c; }
  `,
})
export class RequestDetailPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(HostingRequestService);
  readonly details = signal<HostingRequestDetails | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  private requestId = '';

  ngOnInit(): void {
    this.requestId = this.route.snapshot.paramMap.get('requestId') ?? '';
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      this.details.set(await this.service.details(this.requestId));
    } catch (error) {
      this.error.set(this.service.errorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }
}
