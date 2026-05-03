import {
  Component,
  ElementRef,
  inject,
  signal,
  ViewChild,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { IconComponent } from '../../components/icon/icon.component';
import { AuthService } from '../../services/api/auth.service';
import { ToastService } from '../../services/toast.service';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, RouterModule, TranslateModule, IconComponent],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  route = inject(ActivatedRoute);
  private toast = inject(ToastService);
  private translate = inject(TranslateService);

  @ViewChild('emailInput')
  private emailInput?: ElementRef<HTMLInputElement>;

  loading = signal(false);

  ngAfterViewInit() {
    this.emailInput?.nativeElement.focus();
  }

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  emailInvalid() {
    const c = this.form.controls.email;
    return c.touched && c.invalid;
  }

  passwordInvalid() {
    const c = this.form.controls.password;
    return c.touched && c.invalid;
  }

  submit() {
    if (this.form.invalid || this.loading()) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);

    const { email, password } = this.form.getRawValue();

    this.auth.login({ email: email!, password: password! }).subscribe({
      next: () => {
        this.loading.set(false);
        this.toast.show(
          this.translate.instant('messages.success.auth.login'),
          'success',
        );

        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        this.router.navigateByUrl(returnUrl || '/batches');
      },
      error: (e) => {
        this.loading.set(false);
        const msg =
          e?.error?.detail ||
          e?.error?.message ||
          this.translate.instant('messages.error.auth.login');
        this.toast.show(msg, 'error');
      },
    });
  }
}
