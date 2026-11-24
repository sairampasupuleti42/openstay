import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';
import { HomePageComponent } from './home-page.component';

describe('HomePageComponent', () => {
  it('renders the travel guide prompt and community introduction', async () => {
    await TestBed.configureTestingModule({
      imports: [HomePageComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    const fixture = TestBed.createComponent(HomePageComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.hero h1')?.textContent).toContain(
      'Where shall we go next?',
    );
    expect(
      compiled.querySelector('.destination-search button')?.textContent,
    ).toContain('Explore');
    expect(compiled.querySelector('.principles h2')?.textContent).toContain(
      'Make room for connection.',
    );
  });

  it('searches a suggested destination through Explore', async () => {
    await TestBed.configureTestingModule({
      imports: [HomePageComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    const fixture = TestBed.createComponent(HomePageComponent);
    fixture.detectChanges();
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    const suggestion = fixture.nativeElement.querySelector(
      '.suggestions button',
    ) as HTMLButtonElement;
    suggestion.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(
      (fixture.nativeElement.querySelector('#destination') as HTMLInputElement)
        .value,
    ).toBe('Lisbon');

    fixture.componentInstance.search();

    expect(navigate).toHaveBeenCalledWith(['/explore'], {
      queryParams: { destination: 'Lisbon' },
    });
  });
});
