import { Component, OnInit, computed, inject, signal } from '@angular/core';
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
    h1 { font-size: clamp(32px, 6vw, 48px); line-height: 1.1; }
    .request-section { margin-top: 32px; }
    .card { padding: 24px; margin: 16px 0; border: 1px solid var(--openstay-border); border-radius: 20px; background: var(--openstay-warm-white); box-shadow: var(--openstay-soft-shadow); }
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
  readonly sections = computed(() => {
    const today = new Date().toISOString().slice(0, 10);
    const groups = [
      { key: 'pending', title: this.kind === 'incoming' ? 'Incoming pending requests' : 'Pending requests', items: [] as HostingRequest[] },
      { key: 'upcoming', title: 'Upcoming accepted stays', items: [] as HostingRequest[] },
      { key: 'cancelled', title: 'Cancelled stays and requests', items: [] as HostingRequest[] },
      { key: 'declined', title: 'Declined requests', items: [] as HostingRequest[] },
      { key: 'past', title: 'Past-dated accepted stays', items: [] as HostingRequest[] },
    ];
    for (const request of this.items()) {
      if (request.status === 'pending') groups[0].items.push(request);
      else if (request.status === 'accepted' && request.endDate <= today) groups[4].items.push(request);
      else if (request.status === 'accepted') groups[1].items.push(request);
      else if (request.status === 'cancelled') groups[2].items.push(request);
      else groups[3].items.push(request);
    }
    for (const group of groups) {
      group.items.sort((first, second) => first.startDate.localeCompare(second.startDate));
    }
    groups[4].items.reverse();
    return groups;
  });

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
