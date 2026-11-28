import { Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { BlockedUser } from '../../core/models/trust.model';
import { BlockService } from '../../core/services/block.service';

@Component({
  selector: 'app-blocked-users-page',
  imports: [MatButtonModule, RouterLink],
  templateUrl: './blocked-users-page.component.html',
  styles: `
    :host { display: block; min-height: 80vh; background: var(--openstay-cream); }
    .page { width: min(100%, 760px); margin: auto; padding: 36px 16px 64px; }
    .panel, .entry, .state { padding: clamp(20px, 5vw, 28px); border: 1px solid var(--openstay-border); border-radius: 22px; background: var(--openstay-warm-white); }
    .list { display: grid; gap: 14px; margin-top: 20px; }
    .entry { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; }
    .muted { color: var(--openstay-muted); }
    .error { color: #a4262c; }
  `,
})
export class BlockedUsersPageComponent implements OnInit {
  private readonly service = inject(BlockService);
  readonly users = signal<BlockedUser[]>([]);
  readonly cursor = signal<string | null>(null);
  readonly loading = signal(true);
  readonly loadingMore = signal(false);
  readonly unblockingUid = signal('');
  readonly error = signal('');
  readonly success = signal('');

  ngOnInit(): void {
    void this.load();
  }

  async load(more = false): Promise<void> {
    if (this.loadingMore() || (more && !this.cursor())) return;
    this.loading.set(!more);
    this.loadingMore.set(more);
    this.error.set('');
    try {
      const page = await this.service.list(more ? this.cursor() : null);
      this.users.set(more ? [...this.users(), ...page.items] : page.items);
      this.cursor.set(page.nextCursor);
    } catch (error) {
      this.error.set(this.service.errorMessage(error));
    } finally {
      this.loading.set(false);
      this.loadingMore.set(false);
    }
  }

  async unblock(user: BlockedUser): Promise<void> {
    if (this.unblockingUid()) return;
    this.unblockingUid.set(user.uid);
    this.error.set('');
    this.success.set('');
    try {
      await this.service.unblock(user.uid);
      this.success.set(`${user.displayName} was unblocked. This only restores future eligibility.`);
      await this.load();
    } catch (error) {
      this.error.set(this.service.errorMessage(error));
    } finally {
      this.unblockingUid.set('');
    }
  }
}
