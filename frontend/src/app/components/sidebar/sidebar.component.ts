import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { EmailService } from '../../services/email.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <aside class="sidebar">
      <!-- Compose Pill Button -->
      <div class="compose-wrapper">
        <button type="button" class="btn btn-compose" (click)="emailService.openCompose()">
          <span class="material-symbols-outlined">edit</span>
          <span class="compose-text">Compose</span>
        </button>
      </div>

      <!-- Navigation: Inbox and Sent Only -->
      <nav class="sidebar-nav">
        <a 
          routerLink="/inbox" 
          routerLinkActive="active" 
          class="nav-item">
          <span class="material-symbols-outlined nav-icon">inbox</span>
          <span class="nav-label">Inbox</span>
          @if (emailService.folderCounts().inboxUnread > 0) {
            <span class="badge unread-badge">{{ emailService.folderCounts().inboxUnread }}</span>
          }
        </a>

        <a 
          routerLink="/sent" 
          routerLinkActive="active" 
          class="nav-item">
          <span class="material-symbols-outlined nav-icon">send</span>
          <span class="nav-label">Sent</span>
          @if (emailService.folderCounts().sentTotal > 0) {
            <span class="badge count-badge">{{ emailService.folderCounts().sentTotal }}</span>
          }
        </a>
      </nav>
    </aside>
  `,
  styles: [`
    .sidebar {
      width: 240px;
      height: 100%;
      background-color: var(--bg-surface);
      border-right: 1px solid var(--border-subtle);
      display: flex;
      flex-direction: column;
      padding: 16px 12px;
      flex-shrink: 0;
    }

    .compose-wrapper {
      margin-bottom: 20px;
      padding: 0 4px;
    }

    .btn-compose {
      width: 100%;
      height: 48px;
      padding: 0 24px;
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 14.5px;
      font-weight: 600;
      color: #ffffff;
      background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
      border: none;
      border-radius: var(--radius-full);
      box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35);
      cursor: pointer;
      transition: all var(--transition-normal);
      font-family: inherit;
    }

    .btn-compose:hover {
      background: linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%);
      box-shadow: 0 6px 20px rgba(37, 99, 235, 0.45);
      transform: translateY(-1px);
    }

    .btn-compose:active {
      transform: translateY(1px);
    }

    .btn-compose .material-symbols-outlined {
      font-size: 20px;
    }

    .sidebar-nav {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 10px 16px;
      border-radius: var(--radius-full);
      color: var(--text-secondary);
      text-decoration: none;
      font-size: 13.5px;
      font-weight: 500;
      transition: all var(--transition-fast);
      user-select: none;
    }

    .nav-item:hover {
      background-color: var(--bg-hover);
      color: var(--text-main);
    }

    .nav-item.active {
      background-color: var(--primary-light);
      color: var(--primary);
      font-weight: 700;
    }

    .nav-item.active .nav-icon {
      color: var(--primary);
      font-variation-settings: 'FILL' 1;
    }

    .nav-icon {
      font-size: 20px;
      color: var(--text-secondary);
      transition: color var(--transition-fast);
    }

    .nav-label {
      flex: 1;
    }

    .badge {
      padding: 2px 8px;
      border-radius: var(--radius-full);
      font-size: 11.5px;
      font-weight: 600;
      line-height: 1.2;
    }

    .unread-badge {
      background-color: var(--primary);
      color: #ffffff;
    }

    .count-badge {
      background-color: var(--bg-subtle);
      color: var(--text-secondary);
    }
  `]
})
export class SidebarComponent {
  emailService = inject(EmailService);
}
