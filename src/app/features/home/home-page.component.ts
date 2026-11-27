import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { Router } from '@angular/router';

@Component({
  selector: 'app-home-page',
  imports: [FormsModule, MatButtonModule],
  templateUrl: './home-page.component.html',
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
