import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { DashboardPageComponent } from './dashboard-page.component';

describe('DashboardPageComponent trust availability', () => {
  it('states that verification and report intake are unavailable without implying monitoring', async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardPageComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: {
          currentUser: { uid: 'viewer' },
          getProfile: async () => ({ displayName: 'Traveller' }),
          getErrorMessage: (error: unknown) => String(error),
        } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(DashboardPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Identity verification is not available.');
    expect(text).toContain('does not collect identity documents');
    expect(text).toContain('Report intake is not available yet.');
    expect(text).toContain('Reports are not monitored or resolved');
    expect(text).not.toContain('verified badge');
    const links = Array.from(fixture.nativeElement.querySelectorAll('.dashboard-grid a') as NodeListOf<HTMLAnchorElement>)
      .map((link) => link.getAttribute('href'));
    expect(links).toEqual(expect.arrayContaining([
      '/explore', '/hosting', '/requests/mine', '/requests/incoming',
      '/messages', '/notifications', '/account/blocked-users',
    ]));
    fixture.destroy();
  });
});
