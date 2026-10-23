import { Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { EmailService } from '../../services/email.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-top-nav',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <header class="top-header">
      <!-- Left: Logo -->
      <div class="header-left">
        <div class="logo">
          <div class="logo-icon">
            <span class="material-symbols-outlined">mark_email_unread</span>
          </div>
          <span class="logo-text">Email<span class="logo-accent">Pro</span></span>
        </div>
      </div>

      <!-- Center: Search Bar -->
      <div class="header-center">
        <div class="search-box">
          <span class="material-symbols-outlined search-icon">search</span>
          <input 
            type="text" 
            [(ngModel)]="searchModel" 
            (ngModelChange)="onSearchChange($event)"
            placeholder="Search mail by sender, recipient, subject, or keywords..."
            class="search-input" />
          @if (searchModel) {
            <button type="button" class="search-clear-btn" (click)="clearSearch()">
              <span class="material-symbols-outlined">close</span>
            </button>
          }
        </div>
      </div>

      <!-- Right: Sync, Settings & User Profile Menu -->
      <div class="header-right">
        <!-- Live IMAP Sync Button -->
        <button 
          type="button" 
          class="btn btn-secondary sync-btn" 
          [disabled]="isSyncing()" 
          (click)="triggerImapSync()"
          title="Sync inbound emails via IMAP">
          <span class="material-symbols-outlined" [class.animate-spin]="isSyncing()">sync</span>
          <span class="btn-text">{{ isSyncing() ? 'Syncing...' : 'Sync Mail' }}</span>
        </button>

        <!-- User Profile Dropdown Trigger -->
        <div class="profile-container">
          <button 
            type="button" 
            class="avatar-btn" 
            (click)="toggleMenu()" 
            [attr.aria-expanded]="menuOpen()">
            <span class="avatar-initial">{{ getUserInitial() }}</span>
          </button>

          <!-- Dropdown Menu -->
          @if (menuOpen()) {
            <div class="profile-dropdown" (click)="$event.stopPropagation()">
              <div class="user-info-section">
                <div class="dropdown-avatar">{{ getUserInitial() }}</div>
                <div class="user-details">
                  <div class="user-name">{{ authService.currentUser()?.fullName || 'User' }}</div>
                  <div class="user-email">{{ authService.currentUser()?.email }}</div>
                </div>
              </div>

              <div class="dropdown-divider"></div>

              <div class="config-status">
                <span class="status-label">External SMTP:</span>
                @if (authService.currentUser()?.hasCustomSmtp) {
                  <span class="status-badge badge-active">Custom Active</span>
                } @else {
                  <span class="status-badge badge-default">System Default</span>
                }
              </div>

              <div class="dropdown-divider"></div>

              <button type="button" class="dropdown-item" (click)="openSettings()">
                <span class="material-symbols-outlined">tune</span>
                <span>Mail Settings (SMTP / IMAP)</span>
              </button>

              <button type="button" class="dropdown-item text-danger" (click)="logout()">
                <span class="material-symbols-outlined">logout</span>
                <span>Sign Out</span>
              </button>
            </div>
          }
        </div>
      </div>
    </header>
  `,
  styles: [`
    .top-header {
      height: 64px;
      background-color: var(--bg-surface);
      border-bottom: 1px solid var(--border-subtle);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 20px;
      gap: 16px;
      z-index: 100;
    }

    .header-left {
      display: flex;
      align-items: center;
      min-width: 220px;
    }

    .logo {
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      user-select: none;
    }

    .logo-icon {
      width: 38px;
      height: 38px;
      background: linear-gradient(135deg, #2563eb, #1d4ed8);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ffffff;
      box-shadow: 0 4px 10px rgba(37, 99, 235, 0.3);
    }

    .logo-icon .material-symbols-outlined {
      font-size: 22px;
    }

    .logo-text {
      font-size: 19px;
      font-weight: 800;
      color: var(--text-main);
      letter-spacing: -0.5px;
    }

    .logo-accent {
      color: var(--primary);
    }

    .header-center {
      flex: 1;
      max-width: 720px;
    }

    .search-box {
      position: relative;
      display: flex;
      align-items: center;
      background-color: var(--bg-app);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-full);
      padding: 0 16px;
      height: 44px;
      transition: all var(--transition-fast);
    }

    .search-box:focus-within {
      background-color: #ffffff;
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12), var(--shadow-sm);
    }

    .search-icon {
      color: var(--text-muted);
      margin-right: 10px;
      font-size: 20px;
    }

    .search-input {
      flex: 1;
      border: none;
      background: transparent;
      outline: none;
      font-family: inherit;
      font-size: 14px;
      color: var(--text-main);
    }

    .search-clear-btn {
      background: transparent;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      display: flex;
      padding: 4px;
    }

    .search-clear-btn:hover {
      color: var(--text-main);
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 220px;
      justify-content: flex-end;
    }

    .sync-btn {
      height: 38px;
      padding: 0 14px;
      font-size: 13px;
    }

    .sync-btn .material-symbols-outlined {
      font-size: 18px;
    }

    .profile-container {
      position: relative;
    }

    .avatar-btn {
      width: 40px;
      height: 40px;
      border-radius: var(--radius-full);
      background: linear-gradient(135deg, #2563eb, #3b82f6);
      border: 2px solid #ffffff;
      box-shadow: var(--shadow-xs);
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 15px;
      cursor: pointer;
      transition: all var(--transition-fast);
      outline: none;
    }

    .avatar-btn:hover {
      transform: scale(1.05);
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.2);
    }

    .profile-dropdown {
      position: absolute;
      top: calc(100% + 10px);
      right: 0;
      width: 280px;
      background: #ffffff;
      border-radius: var(--radius-lg);
      border: 1px solid var(--border-subtle);
      box-shadow: var(--shadow-floating);
      padding: 16px;
      z-index: 1000;
      animation: fadeIn 0.15s ease-out;
    }

    .user-info-section {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
    }

    .dropdown-avatar {
      width: 44px;
      height: 44px;
      border-radius: var(--radius-full);
      background: linear-gradient(135deg, #2563eb, #3b82f6);
      color: #ffffff;
      font-size: 18px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .user-details {
      overflow: hidden;
    }

    .user-name {
      font-weight: 700;
      font-size: 14.5px;
      color: var(--text-main);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .user-email {
      font-size: 12.5px;
      color: var(--text-secondary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .dropdown-divider {
      height: 1px;
      background-color: var(--border-subtle);
      margin: 10px -16px;
    }

    .config-status {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 4px 0;
      font-size: 12px;
    }

    .status-label {
      color: var(--text-muted);
    }

    .status-badge {
      padding: 2px 8px;
      border-radius: var(--radius-full);
      font-weight: 600;
      font-size: 11px;
    }

    .badge-active {
      background-color: var(--color-success-bg);
      color: var(--color-success);
    }

    .badge-default {
      background-color: var(--bg-subtle);
      color: var(--text-secondary);
    }

    .dropdown-item {
      width: 100%;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 9px 12px;
      border-radius: var(--radius-md);
      background: transparent;
      border: none;
      color: var(--text-main);
      font-size: 13.5px;
      font-weight: 500;
      cursor: pointer;
      font-family: inherit;
      transition: background var(--transition-fast);
      text-align: left;
    }

    .dropdown-item:hover {
      background-color: var(--bg-hover);
    }

    .dropdown-item.text-danger {
      color: var(--color-error);
    }

    .dropdown-item.text-danger:hover {
      background-color: var(--color-error-bg);
    }

    .dropdown-item .material-symbols-outlined {
      font-size: 19px;
    }

    @media (max-width: 768px) {
      .header-left { min-width: auto; }
      .header-right { min-width: auto; }
      .btn-text { display: none; }
    }
  `]
})
export class TopNavComponent {
  authService = inject(AuthService);
  emailService = inject(EmailService);
  toastService = inject(ToastService);

  @Output() openSettingsModal = new EventEmitter<void>();

  searchModel = '';
  menuOpen = signal<boolean>(false);
  isSyncing = signal<boolean>(false);

  getUserInitial(): string {
    const name = this.authService.currentUser()?.fullName;
    return name ? name.charAt(0).toUpperCase() : 'U';
  }

  toggleMenu(): void {
    this.menuOpen.update(v => !v);
  }

  openSettings(): void {
    this.menuOpen.set(false);
    this.openSettingsModal.emit();
  }

  onSearchChange(term: string): void {
    this.emailService.searchQuery.set(term);
  }

  clearSearch(): void {
    this.searchModel = '';
    this.emailService.searchQuery.set('');
  }

  triggerImapSync(): void {
    this.isSyncing.set(true);
    this.emailService.syncImap().subscribe({
      next: (res) => {
        this.isSyncing.set(false);
        if (res.success) {
          this.toastService.success(res.message);
        } else {
          this.toastService.info(res.message);
        }
      },
      error: (err) => {
        this.isSyncing.set(false);
        this.toastService.error(err.error?.message || 'IMAP sync failed.');
      }
    });
  }

  logout(): void {
    this.menuOpen.set(false);
    this.authService.logout();
    this.toastService.info('You have signed out.');
  }
}
