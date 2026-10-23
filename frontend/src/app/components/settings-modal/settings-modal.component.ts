import { Component, EventEmitter, OnInit, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-settings-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="modal-backdrop" (click)="close()">
      <div class="modal-dialog" (click)="$event.stopPropagation()">
        <!-- Modal Header -->
        <div class="modal-header">
          <div class="header-title">
            <span class="material-symbols-outlined header-icon">tune</span>
            <h2>Mail Delivery & Inbound Settings</h2>
          </div>
          <button type="button" class="btn-icon" (click)="close()">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <!-- Settings Tabs -->
        <div class="settings-tabs">
          <button 
            type="button" 
            class="tab-link" 
            [class.active]="activeTab() === 'smtp'" 
            (click)="activeTab.set('smtp')">
            <span class="material-symbols-outlined">send</span>
            <span>SMTP Sending</span>
          </button>

          <button 
            type="button" 
            class="tab-link" 
            [class.active]="activeTab() === 'imap'" 
            (click)="activeTab.set('imap')">
            <span class="material-symbols-outlined">inbox</span>
            <span>IMAP Inbound Sync</span>
          </button>

          <button 
            type="button" 
            class="tab-link" 
            [class.active]="activeTab() === 'guide'" 
            (click)="activeTab.set('guide')">
            <span class="material-symbols-outlined">help</span>
            <span>Setup Instructions</span>
          </button>
        </div>

        <!-- Form Body -->
        <form [formGroup]="settingsForm" (ngSubmit)="saveSettings()" class="modal-body">
          <!-- SMTP TAB -->
          <div class="tab-pane" [hidden]="activeTab() !== 'smtp'">
            <p class="tab-intro">
              Configure your real outgoing SMTP mail server to deliver emails to Gmail, Outlook, Yahoo, and company domains.
            </p>

            <div class="form-grid">
              <div class="form-group span-2">
                <label for="smtpHost">SMTP Server Host</label>
                <input 
                  id="smtpHost" 
                  type="text" 
                  formControlName="smtpHost" 
                  placeholder="e.g. smtp.gmail.com or smtp.mailgun.org" 
                  class="form-control" />
              </div>

              <div class="form-group">
                <label for="smtpPort">Port</label>
                <input 
                  id="smtpPort" 
                  type="number" 
                  formControlName="smtpPort" 
                  placeholder="587" 
                  class="form-control" />
              </div>

              <div class="form-group checkbox-group">
                <label class="checkbox-container">
                  <input type="checkbox" formControlName="smtpUseSsl" />
                  <span class="custom-checkbox"></span>
                  <span class="chk-label">Use SSL / STARTTLS</span>
                </label>
              </div>

              <div class="form-group">
                <label for="smtpUser">Username / Email</label>
                <input 
                  id="smtpUser" 
                  type="text" 
                  formControlName="smtpUsername" 
                  placeholder="your-email@gmail.com" 
                  class="form-control" />
              </div>

              <div class="form-group">
                <label for="smtpPass">Password / App Password</label>
                <input 
                  id="smtpPass" 
                  type="password" 
                  formControlName="smtpPassword" 
                  placeholder="16-character App Password" 
                  class="form-control" />
              </div>

              <div class="form-group">
                <label for="fromEmail">From Email</label>
                <input 
                  id="fromEmail" 
                  type="email" 
                  formControlName="smtpFromEmail" 
                  placeholder="your-email@gmail.com" 
                  class="form-control" />
              </div>

              <div class="form-group">
                <label for="fromName">Sender Name</label>
                <input 
                  id="fromName" 
                  type="text" 
                  formControlName="smtpFromName" 
                  placeholder="Your Full Name" 
                  class="form-control" />
              </div>
            </div>
          </div>

          <!-- IMAP TAB -->
          <div class="tab-pane" [hidden]="activeTab() !== 'imap'">
            <p class="tab-intro">
              Connect your external mailbox via IMAP to automatically download new incoming emails directly into your EmailPro Inbox.
            </p>

            <div class="form-grid">
              <div class="form-group span-2">
                <label for="imapHost">IMAP Server Host</label>
                <input 
                  id="imapHost" 
                  type="text" 
                  formControlName="imapHost" 
                  placeholder="e.g. imap.gmail.com" 
                  class="form-control" />
              </div>

              <div class="form-group">
                <label for="imapPort">Port</label>
                <input 
                  id="imapPort" 
                  type="number" 
                  formControlName="imapPort" 
                  placeholder="993" 
                  class="form-control" />
              </div>

              <div class="form-group checkbox-group">
                <label class="checkbox-container">
                  <input type="checkbox" formControlName="imapUseSsl" />
                  <span class="custom-checkbox"></span>
                  <span class="chk-label">Use SSL (Port 993)</span>
                </label>
              </div>

              <div class="form-group">
                <label for="imapUser">Username / Email</label>
                <input 
                  id="imapUser" 
                  type="text" 
                  formControlName="imapUsername" 
                  placeholder="your-email@gmail.com" 
                  class="form-control" />
              </div>

              <div class="form-group">
                <label for="imapPass">Password / App Password</label>
                <input 
                  id="imapPass" 
                  type="password" 
                  formControlName="imapPassword" 
                  placeholder="16-character App Password" 
                  class="form-control" />
              </div>
            </div>
          </div>

          <!-- GUIDE TAB -->
          <div class="tab-pane guide-pane" [hidden]="activeTab() !== 'guide'">
              <div class="guide-card">
                <h3><span class="material-symbols-outlined">key</span> How to generate a Gmail App Password:</h3>
                <ol class="guide-steps">
                  <li>Go to your <strong>Google Account Settings</strong> (myaccount.google.com).</li>
                  <li>Click on <strong>Security</strong> in the left navigation.</li>
                  <li>Under <em>"How you sign in to Google"</em>, ensure <strong>2-Step Verification</strong> is enabled.</li>
                  <li>Search for <strong>"App passwords"</strong> in the search bar.</li>
                  <li>Give it an App name like <code>EmailPro</code>, then click <strong>Create</strong>.</li>
                  <li>Copy the 16-character code (e.g. <code>abcd efgh ijkl mnop</code>) and paste it into the password fields above!</li>
                </ol>
              </div>

              <div class="guide-card">
                <h3><span class="material-symbols-outlined">webhook</span> Inbound Webhook Endpoint:</h3>
                <p>
                  If you use <strong>SendGrid Inbound Parse</strong>, <strong>Mailgun Routes</strong>, or <strong>Postmark Inbound</strong>, configure the webhook URL to:
                </p>
                <div class="code-box">
                  <code>POST http://localhost:5258/api/emails/inbound</code>
                </div>
                <p style="font-size: 12.5px; color: var(--text-muted); margin-top: 6px;">
                  Incoming messages with valid recipient headers will be matched to the local user's account and instantly delivered to their Inbox.
                </p>
              </div>
            </div>
          }

          <!-- Modal Footer -->
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" (click)="close()">Cancel</button>
            <button type="submit" class="btn btn-primary" [disabled]="isSaving()">
              @if (isSaving()) {
                <span class="material-symbols-outlined animate-spin">progress_activity</span>
                <span>Saving...</span>
              } @else {
                <span class="material-symbols-outlined">save</span>
                <span>Save Mail Settings</span>
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.45);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 3000;
      padding: 20px;
    }

    .modal-dialog {
      width: 100%;
      max-width: 620px;
      background: #ffffff;
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-floating);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      animation: fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .modal-header {
      padding: 18px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid var(--border-subtle);
    }

    .header-title {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .header-icon {
      color: var(--primary);
      font-size: 24px;
    }

    .header-title h2 {
      font-size: 17px;
      font-weight: 700;
      color: var(--text-main);
    }

    .settings-tabs {
      display: flex;
      background: var(--bg-app);
      border-bottom: 1px solid var(--border-subtle);
      padding: 0 16px;
      gap: 8px;
    }

    .tab-link {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 14px;
      border: none;
      background: transparent;
      font-size: 13px;
      font-weight: 600;
      color: var(--text-secondary);
      border-bottom: 2px solid transparent;
      cursor: pointer;
      transition: all var(--transition-fast);
      font-family: inherit;
    }

    .tab-link:hover {
      color: var(--primary);
    }

    .tab-link.active {
      color: var(--primary);
      border-bottom-color: var(--primary);
      background: #ffffff;
    }

    .tab-link .material-symbols-outlined {
      font-size: 18px;
    }

    .modal-body {
      display: flex;
      flex-direction: column;
    }

    .tab-pane {
      padding: 24px;
      max-height: 480px;
      overflow-y: auto;
    }

    .tab-intro {
      font-size: 13px;
      color: var(--text-secondary);
      margin-bottom: 20px;
      line-height: 1.5;
    }

    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    .span-2 {
      grid-column: span 2;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .form-group label {
      font-size: 12.5px;
      font-weight: 600;
      color: var(--text-main);
    }

    .form-control {
      padding: 8px 12px;
      font-size: 13.5px;
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      outline: none;
      font-family: inherit;
    }

    .form-control:focus {
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
    }

    .checkbox-group {
      justify-content: flex-end;
      padding-bottom: 8px;
    }

    .chk-label {
      font-size: 13px;
      font-weight: 500;
      color: var(--text-main);
      margin-left: 8px;
    }

    /* Checkbox */
    .checkbox-container {
      display: flex;
      align-items: center;
      cursor: pointer;
    }

    .checkbox-container input {
      position: absolute;
      opacity: 0;
    }

    .custom-checkbox {
      width: 17px;
      height: 17px;
      border: 1.5px solid var(--border-strong);
      border-radius: 4px;
      background: #ffffff;
      display: inline-block;
      transition: all var(--transition-fast);
    }

    .checkbox-container input:checked ~ .custom-checkbox {
      background-color: var(--primary);
      border-color: var(--primary);
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 16 16' fill='white' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z'/%3E%3C/svg%3E");
      background-position: center;
      background-repeat: no-repeat;
    }

    .guide-pane {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .guide-card {
      background-color: var(--bg-app);
      border-radius: var(--radius-md);
      padding: 16px;
      border: 1px solid var(--border-subtle);
    }

    .guide-card h3 {
      font-size: 14px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 10px;
      color: var(--primary-dark);
    }

    .guide-steps {
      padding-left: 20px;
      font-size: 13px;
      line-height: 1.6;
      color: var(--text-secondary);
    }

    .code-box {
      background: #1e293b;
      color: #38bdf8;
      padding: 8px 12px;
      border-radius: 6px;
      font-family: monospace;
      font-size: 12.5px;
      margin-top: 8px;
      word-break: break-all;
    }

    .modal-footer {
      padding: 14px 24px;
      background: #ffffff;
      border-top: 1px solid var(--border-subtle);
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 10px;
    }
  `]
})
export class SettingsModalComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);

  @Output() closeSettings = new EventEmitter<void>();

  activeTab = signal<'smtp' | 'imap' | 'guide'>('smtp');
  isSaving = signal<boolean>(false);

  settingsForm = this.fb.group({
    smtpHost: ['smtp.gmail.com'],
    smtpPort: [587],
    smtpUseSsl: [true],
    smtpUsername: [''],
    smtpPassword: [''],
    smtpFromEmail: [''],
    smtpFromName: [''],

    imapHost: ['imap.gmail.com'],
    imapPort: [993],
    imapUseSsl: [true],
    imapUsername: [''],
    imapPassword: ['']
  });

  ngOnInit(): void {
    const user = this.authService.currentUser();
    if (user) {
      if (user.smtpSettings) {
        this.settingsForm.patchValue({
          smtpHost: user.smtpSettings.host || 'smtp.gmail.com',
          smtpPort: user.smtpSettings.port || 587,
          smtpUseSsl: user.smtpSettings.useSsl ?? true,
          smtpUsername: user.smtpSettings.username || user.email,
          smtpFromEmail: user.smtpSettings.fromEmail || user.email,
          smtpFromName: user.smtpSettings.fromName || user.fullName
        });
      } else {
        this.settingsForm.patchValue({
          smtpUsername: user.email,
          smtpFromEmail: user.email,
          smtpFromName: user.fullName
        });
      }

      if (user.imapSettings) {
        this.settingsForm.patchValue({
          imapHost: user.imapSettings.host || 'imap.gmail.com',
          imapPort: user.imapSettings.port || 993,
          imapUseSsl: user.imapSettings.useSsl ?? true,
          imapUsername: user.imapSettings.username || user.email
        });
      } else {
        this.settingsForm.patchValue({
          imapUsername: user.email
        });
      }
    }
  }

  close(): void {
    this.closeSettings.emit();
  }

  saveSettings(): void {
    this.isSaving.set(true);
    const val = this.settingsForm.value;

    const effectiveSmtpPassword = val.smtpPassword || undefined;
    // If IMAP password was left blank, auto-use the SMTP password since Gmail/Outlook use the same App Password
    const effectiveImapPassword = val.imapPassword || effectiveSmtpPassword;
    const effectiveImapUsername = val.imapUsername || val.smtpUsername || '';

    this.authService.updateSettings({
      smtp: {
        host: val.smtpHost || '',
        port: Number(val.smtpPort) || 587,
        useSsl: !!val.smtpUseSsl,
        username: val.smtpUsername || '',
        password: effectiveSmtpPassword,
        fromEmail: val.smtpFromEmail || '',
        fromName: val.smtpFromName || ''
      },
      imap: {
        host: val.imapHost || 'imap.gmail.com',
        port: Number(val.imapPort) || 993,
        useSsl: !!val.imapUseSsl,
        username: effectiveImapUsername,
        password: effectiveImapPassword
      }
    }).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.toastService.success('Email server settings updated successfully.');
        this.close();
      },
      error: (err) => {
        this.isSaving.set(false);
        this.toastService.error(err.error?.message || 'Failed to save settings.');
      }
    });
  }
}
