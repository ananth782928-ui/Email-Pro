import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-wrapper">
      @for (toast of toastService.toasts(); track toast.id) {
        <div class="toast-item" [ngClass]="'toast-' + toast.type">
          <div class="toast-icon">
            @if (toast.type === 'success') {
              <span class="material-symbols-outlined">check_circle</span>
            } @else if (toast.type === 'error') {
              <span class="material-symbols-outlined">error</span>
            } @else {
              <span class="material-symbols-outlined">info</span>
            }
          </div>
          <div class="toast-message">{{ toast.message }}</div>
          <button class="toast-close" (click)="toastService.remove(toast.id)" aria-label="Close notification">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .toast-wrapper {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-width: 420px;
      pointer-events: none;
    }

    .toast-item {
      pointer-events: auto;
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-lg);
      font-size: 13.5px;
      font-weight: 500;
      animation: slideInUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      border: 1px solid transparent;
      backdrop-filter: blur(8px);
    }

    .toast-success {
      background-color: #ffffff;
      color: #065f46;
      border-color: #a7f3d0;
    }
    .toast-success .toast-icon { color: var(--color-success); }

    .toast-error {
      background-color: #ffffff;
      color: #991b1b;
      border-color: #fecaca;
    }
    .toast-error .toast-icon { color: var(--color-error); }

    .toast-info {
      background-color: #ffffff;
      color: #1e40af;
      border-color: #bfdbfe;
    }
    .toast-info .toast-icon { color: var(--primary); }

    .toast-icon {
      display: flex;
      align-items: center;
      flex-shrink: 0;
    }

    .toast-message {
      flex: 1;
      line-height: 1.4;
      word-break: break-word;
    }

    .toast-close {
      background: transparent;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      display: flex;
      padding: 2px;
      border-radius: 4px;
    }

    .toast-close:hover {
      color: var(--text-main);
      background-color: rgba(0, 0, 0, 0.05);
    }
  `]
})
export class ToastContainerComponent {
  toastService = inject(ToastService);
}
