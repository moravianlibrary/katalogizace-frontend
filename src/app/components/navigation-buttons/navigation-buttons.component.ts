import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-navigation-buttons',
  imports: [],
  templateUrl: './navigation-buttons.component.html',
})
export class NavigationButtonsComponent {
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  goBack() {
    this.router
      .navigate(['..'], {
        relativeTo: this.route,
        queryParamsHandling: 'preserve',
      })
      .catch(() => {
        this.router.navigate(['/books']);
      });
  }

  addField() {
    /* TODO */
  }
  save() {
    /* TODO */
  }
}
