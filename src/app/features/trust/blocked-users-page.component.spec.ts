import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { BlockService } from '../../core/services/block.service';
import { BlockedUsersPageComponent } from './blocked-users-page.component';

describe('BlockedUsersPageComponent', () => {
  const list = vi.fn();
  const unblock = vi.fn();

  beforeEach(async () => {
    vi.resetAllMocks();
    list.mockResolvedValue({ items: [], nextCursor: null });
    unblock.mockResolvedValue(undefined);
    await TestBed.configureTestingModule({
      imports: [BlockedUsersPageComponent],
      providers: [
        provideRouter([]),
        { provide: BlockService, useValue: { list, unblock, errorMessage: (error: unknown) =>
          error instanceof Error ? error.message : 'Error' } },
      ],
    }).compileComponents();
  });

  it('shows loading and empty states without presenting a report service', async () => {
    let resolve!: (value: { items: []; nextCursor: null }) => void;
    list.mockReturnValueOnce(new Promise((done) => { resolve = done; }));
    const fixture = TestBed.createComponent(BlockedUsersPageComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Loading blocked users');
    resolve({ items: [], nextCursor: null });
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('You have not blocked anyone.');
    expect(fixture.nativeElement.textContent).not.toContain('Report and get help');
    fixture.destroy();
  });

  it('shows an explicit load error and supports retry', async () => {
    list.mockRejectedValueOnce(new Error('Could not load blocks'));
    const fixture = TestBed.createComponent(BlockedUsersPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Could not load blocks');
    list.mockResolvedValueOnce({
      items: [{ uid: 'blocked-1', displayName: 'Blocked member' }],
      nextCursor: null,
    });
    await fixture.componentInstance.load();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Blocked member');
    fixture.destroy();
  });

  it('unblocks only after an explicit user action and reports success or failure', async () => {
    const user = { uid: 'blocked-1', displayName: 'Blocked member' };
    list.mockResolvedValueOnce({ items: [user], nextCursor: null });
    list.mockResolvedValueOnce({ items: [], nextCursor: null });
    const fixture = TestBed.createComponent(BlockedUsersPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    await fixture.componentInstance.unblock(user);
    fixture.detectChanges();
    expect(unblock).toHaveBeenCalledWith(user.uid);
    expect(fixture.nativeElement.textContent).toContain('This only restores future eligibility.');
    expect(fixture.nativeElement.textContent).toContain('You have not blocked anyone.');

    list.mockResolvedValueOnce({ items: [user], nextCursor: null });
    await fixture.componentInstance.load();
    unblock.mockRejectedValueOnce(new Error('Unblock failed'));
    await fixture.componentInstance.unblock(user);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Unblock failed');
    fixture.destroy();
  });
});
