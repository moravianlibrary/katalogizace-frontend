import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../services/api/auth.service';
import { ToastService } from '../../services/toast.service';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, RouterModule],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  route = inject(ActivatedRoute);
  private toast = inject(ToastService);
  private translate = inject(TranslateService);

  loading = signal(false);

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  emailInvalid() {
    const c = this.form.controls.email;
    return c.touched && c.invalid;
  }

  get emailCtrl() {
    return this.form.controls.email;
  }

  emailDisabled() {
    return this.emailCtrl.disabled || this.loading();
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
