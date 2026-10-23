import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { TopNavComponent } from '../top-nav/top-nav.component';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { ComposeModalComponent } from '../compose-modal/compose-modal.component';
import { SettingsModalComponent } from '../settings-modal/settings-modal.component';
import { ToastContainerComponent } from '../toast-container/toast-container.component';
import { EmailService } from '../../services/email.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    CommonModule, 
    RouterOutlet, 
    TopNavComponent, 
    SidebarComponent, 
    ComposeModalComponent, 
    SettingsModalComponent, 
    ToastContainerComponent
  ],
  template: `
    <div class="app-layout">
      <!-- Top Navigation -->
      <app-top-nav (openSettingsModal)="openSettings()"></app-top-nav>

      <!-- Main Shell: Left Sidebar + Mailbox Content -->
      <div class="app-shell">
        <app-sidebar></app-sidebar>
        
        <main class="main-content">
          <router-outlet></router-outlet>
        </main>
      </div>

      <!-- Floating Gmail-Style Compose Window -->
      @if (emailService.composeOpen()) {
        <app-compose-modal></app-compose-modal>
      }

      <!-- Settings & Mail Configuration Modal -->
      @if (settingsOpen()) {
        <app-settings-modal (closeSettings)="closeSettings()"></app-settings-modal>
      }

      <!-- System Toasts -->
      <app-toast-container></app-toast-container>
    </div>
  `,
  styles: [`
    .app-layout {
      display: flex;
      flex-direction: column;
      height: 100vh;
      width: 100vw;
      overflow: hidden;
      background-color: var(--bg-app);
    }

    .app-shell {
      display: flex;
      flex: 1;
      height: calc(100vh - 64px);
      overflow: hidden;
    }

    .main-content {
      flex: 1;
      height: 100%;
      overflow: hidden;
      background-color: #ffffff;
      position: relative;
    }
  `]
})
export class MainLayoutComponent implements OnInit {
  emailService = inject(EmailService);
  private authService = inject(AuthService);

  settingsOpen = signal<boolean>(false);

  ngOnInit(): void {
    // Initial folder counts fetch
    this.emailService.getFolderCounts().subscribe();
    // Refresh user profile
    this.authService.fetchProfile().subscribe();
  }

  openSettings(): void {
    this.settingsOpen.set(true);
  }

  closeSettings(): void {
    this.settingsOpen.set(false);
  }
}
