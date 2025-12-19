import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

@Component({
  standalone: true,
  selector: 'app-register',
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './register.component.html',
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private toast = inject(ToastService);

  loading = signal(false);

  form = this.fb.group({
    full_name: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  fullNameInvalid() {
    const c = this.form.controls.full_name;
    return c.touched && c.invalid;
  }

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
    const { full_name, email, password } = this.form.getRawValue();

    this.auth
      .register({ email: email!, password: password!, full_name: full_name! })
      .subscribe({
        next: () => {
          this.loading.set(false);
          this.toast.show(
            'Účet byl úspěšně vytvořen. Nyní se můžete přihlásit.',
            'success',
          );

          setTimeout(() => this.router.navigateByUrl('/login'), 400);
        },
        error: (e) => {
          this.loading.set(false);
          const msg =
            e?.error?.detail ||
            e?.error?.message ||
            'Registrace se nezdařila. Zkuste jiný e-mail nebo zkontrolujte údaje.';
          this.toast.show(msg, 'error');
        },
      });
  }
}
