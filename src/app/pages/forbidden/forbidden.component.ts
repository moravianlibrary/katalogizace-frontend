import { AuthService } from '@/app/services/api/auth.service';
import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  standalone: true,
  selector: 'app-forbidden',
  imports: [RouterLink, TranslateModule],
  templateUrl: './forbidden.component.html',
})
export class ForbiddenComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  loginAsDifferentUser() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
