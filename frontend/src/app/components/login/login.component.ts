import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="auth-container">
      <div class="auth-card">
        <!-- Brand Header -->
        <div class="brand-header">
          <div class="brand-logo">
            <span class="material-symbols-outlined">mark_email_unread</span>
          </div>
          <h1 class="brand-title">EmailPro</h1>
          <p class="brand-subtitle">Modern, secure, and fast full-stack email platform</p>
        </div>

        <!-- Mode Tabs -->
        <div class="tab-header">
          <button 
            type="button" 
            class="tab-btn" 
            [class.active]="isLoginMode()" 
            (click)="setMode(true)">
            Sign In
          </button>
          <button 
            type="button" 
            class="tab-btn" 
            [class.active]="!isLoginMode()" 
            (click)="setMode(false)">
            Create Account
          </button>
        </div>

        <!-- Form Error Notice -->
        @if (errorMessage()) {
          <div class="error-banner">
            <span class="material-symbols-outlined">warning</span>
            <span>{{ errorMessage() }}</span>
          </div>
        }

        <!-- Auth Form -->
        <form [formGroup]="authForm" (ngSubmit)="onSubmit()" class="form-body">
          @if (!isLoginMode()) {
            <div class="form-group">
              <label for="fullName">Full Name</label>
              <div class="input-wrapper">
                <span class="material-symbols-outlined input-icon">person</span>
                <input 
                  id="fullName" 
                  type="text" 
                  formControlName="fullName" 
                  placeholder="e.g. John Doe"
                  class="form-control" />
              </div>
              @if (authForm.get('fullName')?.touched && authForm.get('fullName')?.invalid) {
                <span class="field-error">Please enter your full name.</span>
              }
            </div>
          }

          <div class="form-group">
            <label for="email">Email Address</label>
            <div class="input-wrapper">
              <span class="material-symbols-outlined input-icon">mail</span>
              <input 
                id="email" 
                type="email" 
                formControlName="email" 
                placeholder="name@example.com"
                class="form-control" />
            </div>
            @if (authForm.get('email')?.touched && authForm.get('email')?.invalid) {
              <span class="field-error">Please enter a valid email address.</span>
            }
          </div>

          <div class="form-group">
            <label for="password">Password</label>
            <div class="input-wrapper">
              <span class="material-symbols-outlined input-icon">lock</span>
              <input 
                id="password" 
                [type]="showPassword() ? 'text' : 'password'" 
                formControlName="password" 
                placeholder="Minimum 6 characters"
                class="form-control" />
              <button 
                type="button" 
                class="pw-toggle-btn" 
                (click)="togglePasswordVisibility()" 
                tabindex="-1">
                <span class="material-symbols-outlined">{{ showPassword() ? 'visibility_off' : 'visibility' }}</span>
              </button>
            </div>
            @if (authForm.get('password')?.touched && authForm.get('password')?.invalid) {
              <span class="field-error">Password must be at least 6 characters.</span>
            }
          </div>

          <button 
            type="submit" 
            class="btn btn-primary submit-btn" 
            [disabled]="authForm.invalid || isLoading()">
            @if (isLoading()) {
              <span class="material-symbols-outlined animate-spin">progress_activity</span>
              <span>Processing...</span>
            } @else {
              <span>{{ isLoginMode() ? 'Sign In to Mailbox' : 'Register & Get Started' }}</span>
              <span class="material-symbols-outlined">arrow_forward</span>
            }
          </button>
        </form>

        <!-- Quick Demo Fill -->
        <div class="demo-box">
          <p class="demo-label">Testing or pair programming?</p>
          <button type="button" class="btn btn-secondary demo-btn" (click)="fillDemoUser()">
            <span class="material-symbols-outlined">flash_on</span>
            <span>Use Demo Account (testuser&#64;emailpro.local)</span>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .auth-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      background: radial-gradient(circle at 50% 0%, #eff6ff 0%, #f8fafc 75%);
    }

    .auth-card {
      width: 100%;
      max-width: 440px;
      background: #ffffff;
      border-radius: var(--radius-lg);
      padding: 40px;
      box-shadow: 0 10px 25px -5px rgba(37, 99, 235, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04);
      border: 1px solid var(--border-subtle);
    }

    .brand-header {
      text-align: center;
      margin-bottom: 28px;
    }

    .brand-logo {
      width: 56px;
      height: 56px;
      margin: 0 auto 16px;
      background: linear-gradient(135deg, #2563eb, #1d4ed8);
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ffffff;
      box-shadow: 0 8px 16px -4px rgba(37, 99, 235, 0.35);
    }

    .brand-logo .material-symbols-outlined {
      font-size: 32px;
    }

    .brand-title {
      font-size: 24px;
      font-weight: 700;
      color: var(--text-main);
      letter-spacing: -0.5px;
    }

    .brand-subtitle {
      font-size: 13.5px;
      color: var(--text-secondary);
      margin-top: 4px;
    }

    .tab-header {
      display: flex;
      background-color: #f1f5f9;
      padding: 4px;
      border-radius: var(--radius-md);
      margin-bottom: 24px;
    }

    .tab-btn {
      flex: 1;
      padding: 8px 12px;
      font-size: 13.5px;
      font-weight: 600;
      background: transparent;
      border: none;
      border-radius: var(--radius-sm);
      color: var(--text-secondary);
      cursor: pointer;
      transition: all var(--transition-fast);
      font-family: inherit;
    }

    .tab-btn.active {
      background: #ffffff;
      color: var(--primary);
      box-shadow: var(--shadow-xs);
    }

    .error-banner {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 14px;
      border-radius: var(--radius-md);
      background-color: var(--color-error-bg);
      color: var(--color-error);
      border: 1px solid #fecaca;
      font-size: 13px;
      margin-bottom: 20px;
    }

    .form-body {
      display: flex;
      flex-direction: column;
      gap: 18px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .form-group label {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-main);
    }

    .input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }

    .input-icon {
      position: absolute;
      left: 12px;
      color: var(--text-muted);
      font-size: 19px;
      pointer-events: none;
    }

    .form-control {
      width: 100%;
      padding: 10px 14px 10px 38px;
      font-size: 14px;
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      background-color: #ffffff;
      color: var(--text-main);
      font-family: inherit;
      transition: all var(--transition-fast);
      outline: none;
    }

    .form-control:focus {
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
    }

    .pw-toggle-btn {
      position: absolute;
      right: 10px;
      background: transparent;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      display: flex;
      align-items: center;
      padding: 4px;
    }

    .pw-toggle-btn:hover {
      color: var(--text-secondary);
    }

    .field-error {
      font-size: 12px;
      color: var(--color-error);
    }

    .submit-btn {
      width: 100%;
      padding: 11px;
      font-size: 14.5px;
      margin-top: 6px;
    }

    .demo-box {
      margin-top: 24px;
      padding-top: 20px;
      border-top: 1px dashed var(--border-subtle);
      text-align: center;
    }

    .demo-label {
      font-size: 12px;
      color: var(--text-muted);
      margin-bottom: 8px;
    }

    .demo-btn {
      width: 100%;
      font-size: 12.5px;
      padding: 8px 12px;
      color: var(--primary-dark);
      background-color: var(--primary-light);
      border-color: var(--primary-border);
    }

    .demo-btn:hover {
      background-color: #dbeafe;
    }
  `]
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);
  private router = inject(Router);

  isLoginMode = signal<boolean>(true);
  showPassword = signal<boolean>(false);
  isLoading = signal<boolean>(false);
  errorMessage = signal<string>('');

  authForm = this.fb.group({
    fullName: [''],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  setMode(login: boolean): void {
    this.isLoginMode.set(login);
    this.errorMessage.set('');
    const nameControl = this.authForm.get('fullName');
    if (login) {
      nameControl?.clearValidators();
    } else {
      nameControl?.setValidators([Validators.required]);
    }
    nameControl?.updateValueAndValidity();
  }

  togglePasswordVisibility(): void {
    this.showPassword.update(v => !v);
  }

  fillDemoUser(): void {
    this.isLoginMode.set(true);
    this.authForm.patchValue({
      email: 'testuser@emailpro.local',
      password: 'Password123!'
    });
  }

  onSubmit(): void {
    if (this.authForm.invalid) {
      this.authForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    const formVal = this.authForm.value;

    if (this.isLoginMode()) {
      this.authService.login({
        email: formVal.email!,
        password: formVal.password!
      }).subscribe({
        next: (res) => {
          this.isLoading.set(false);
          this.toastService.success(`Welcome back, ${res.user.fullName}!`);
          this.router.navigate(['/inbox']);
        },
        error: (err) => {
          this.isLoading.set(false);
          const msg = err.error?.message || 'Login failed. Please check your email and password.';
          this.errorMessage.set(msg);
        }
      });
    } else {
      this.authService.register({
        fullName: formVal.fullName!,
        email: formVal.email!,
        password: formVal.password!
      }).subscribe({
        next: (res) => {
          this.isLoading.set(false);
          this.toastService.success(`Account created! Welcome to EmailPro, ${res.user.fullName}.`);
          this.router.navigate(['/inbox']);
        },
        error: (err) => {
          this.isLoading.set(false);
          const msg = err.error?.message || 'Registration failed. Please try a different email.';
          this.errorMessage.set(msg);
        }
      });
    }
  }
}
