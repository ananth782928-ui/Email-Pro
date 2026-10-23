import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { EmailService } from '../../services/email.service';
import { ToastService } from '../../services/toast.service';
import { EmailDetail } from '../../models/email.model';

@Component({
  selector: 'app-email-detail',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="email-detail-container">
      <!-- Detail Action Bar -->
      <div class="detail-toolbar">
        <button type="button" class="btn-icon" (click)="goBack()" title="Back to messages">
          <span class="material-symbols-outlined">arrow_back</span>
        </button>

        <div class="toolbar-divider"></div>

        <button type="button" class="btn-icon" (click)="markUnread()" title="Mark as unread">
          <span class="material-symbols-outlined">mark_email_unread</span>
        </button>

        <button type="button" class="btn-icon text-danger" (click)="deleteEmail()" title="Delete conversation">
          <span class="material-symbols-outlined">delete</span>
        </button>

        <button 
          type="button" 
          class="btn-icon" 
          [class.starred]="email()?.isStarred" 
          (click)="toggleStar()" 
          title="Star conversation">
          <span class="material-symbols-outlined" [class.filled]="email()?.isStarred">star</span>
        </button>
      </div>

      <!-- Detail Content Area -->
      @if (isLoading()) {
        <div class="loading-state">
          <span class="material-symbols-outlined animate-spin spinner">progress_activity</span>
          <p>Opening email...</p>
        </div>
      } @else if (email()) {
        <div class="detail-body">
          <!-- Subject & Status Header -->
          <div class="subject-header">
            <h1 class="email-title">{{ email()!.subject }}</h1>

            <!-- Delivery status badge -->
            @if (email()!.folder === 'sent') {
              @if (email()!.deliveryStatus === 'Sent' || email()!.deliveryStatus === 'Delivered') {
                <span class="status-badge status-sent">
                  <span class="material-symbols-outlined icon-mini">check_circle</span>
                  <span>Sent via SMTP</span>
                </span>
              } @else if (email()!.deliveryStatus === 'Failed') {
                <span class="status-badge status-failed">
                  <span class="material-symbols-outlined icon-mini">error</span>
                  <span>SMTP Delivery Failed</span>
                </span>
              }
            } @else {
              <span class="status-badge status-received">
                <span class="material-symbols-outlined icon-mini">inbox</span>
                <span>Inbox</span>
              </span>
            }
          </div>

          <!-- Error Alert Banner if delivery failed -->
          @if (email()!.deliveryStatus === 'Failed' && email()!.deliveryError) {
            <div class="delivery-error-alert">
              <span class="material-symbols-outlined alert-icon">report</span>
              <div class="alert-content">
                <strong>External Delivery Failure Notice:</strong>
                <p>{{ email()!.deliveryError }}</p>
              </div>
            </div>
          }

          <!-- Sender / Recipient Metadata Card -->
          <div class="meta-section">
            <div class="sender-avatar">
              {{ getSenderInitial() }}
            </div>
            <div class="meta-details">
              <div class="sender-row">
                <span class="sender-name">{{ email()!.from.name || email()!.from.address }}</span>
                <span class="sender-email">&lt;{{ email()!.from.address }}&gt;</span>
                <span class="email-time">{{ formatFullDate(email()!.createdAt) }}</span>
              </div>
              <div class="recipient-row">
                <span class="rec-label">to:</span>
                <span class="rec-list">{{ formatRecipientList(email()!.to) }}</span>
                @if (email()!.cc && email()!.cc.length > 0) {
                  <span class="rec-label" style="margin-left: 12px;">cc:</span>
                  <span class="rec-list">{{ formatRecipientList(email()!.cc) }}</span>
                }
              </div>
            </div>
          </div>

          <!-- Email Message Body -->
          <div class="body-content">
            <div [innerHTML]="email()!.body" class="rendered-html"></div>
          </div>

          <!-- Attachments Section (if present) -->
          @if (email()!.attachments && email()!.attachments.length > 0) {
            <div class="attachments-section">
              <h3 class="att-heading">
                <span class="material-symbols-outlined">attachment</span>
                <span>{{ email()!.attachments.length }} Attachment(s)</span>
              </h3>
              <div class="att-grid">
                @for (att of email()!.attachments; track att.id) {
                  <div class="att-card">
                    <div class="att-icon-box">
                      <span class="material-symbols-outlined">draft</span>
                    </div>
                    <div class="att-info">
                      <div class="att-name" [title]="att.fileName">{{ att.fileName }}</div>
                      <div class="att-size">{{ formatBytes(att.sizeBytes) }}</div>
                    </div>
                    <button 
                      type="button" 
                      class="btn btn-secondary att-download-btn" 
                      (click)="downloadAttachment(att)" 
                      title="Download file">
                      <span class="material-symbols-outlined">download</span>
                    </button>
                  </div>
                }
              </div>
            </div>
          }

          <!-- Reply / Forward Quick Action Buttons -->
          <div class="action-footer">
            <button type="button" class="btn btn-secondary action-btn" (click)="reply()">
              <span class="material-symbols-outlined">reply</span>
              <span>Reply</span>
            </button>

            <button type="button" class="btn btn-secondary action-btn" (click)="forward()">
              <span class="material-symbols-outlined">forward</span>
              <span>Forward</span>
            </button>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .email-detail-container {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: #ffffff;
      overflow-y: auto;
    }

    .detail-toolbar {
      height: 48px;
      padding: 0 16px;
      display: flex;
      align-items: center;
      gap: 10px;
      border-bottom: 1px solid var(--border-subtle);
      background-color: #ffffff;
      flex-shrink: 0;
      position: sticky;
      top: 0;
      z-index: 10;
    }

    .toolbar-divider {
      width: 1px;
      height: 20px;
      background-color: var(--border-subtle);
      margin: 0 4px;
    }

    .detail-body {
      padding: 24px 32px;
      max-width: 960px;
    }

    .subject-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 20px;
    }

    .email-title {
      font-size: 22px;
      font-weight: 700;
      color: var(--text-main);
      line-height: 1.3;
      letter-spacing: -0.3px;
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 4px 10px;
      border-radius: var(--radius-full);
      font-size: 12px;
      font-weight: 600;
      white-space: nowrap;
      flex-shrink: 0;
    }

    .icon-mini {
      font-size: 15px;
    }

    .status-sent {
      background-color: #ecfdf5;
      color: #059669;
    }

    .status-failed {
      background-color: #fef2f2;
      color: #dc2626;
      border: 1px solid #fecaca;
    }

    .status-received {
      background-color: var(--primary-light);
      color: var(--primary);
    }

    .delivery-error-alert {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 12px 16px;
      border-radius: var(--radius-md);
      background-color: #fef2f2;
      border: 1px solid #fecaca;
      color: #991b1b;
      margin-bottom: 20px;
      font-size: 13px;
    }

    .alert-icon {
      color: var(--color-error);
      font-size: 20px;
      flex-shrink: 0;
      margin-top: 1px;
    }

    .alert-content p {
      margin-top: 2px;
      line-height: 1.4;
    }

    .meta-section {
      display: flex;
      align-items: flex-start;
      gap: 14px;
      margin-bottom: 28px;
      padding-bottom: 20px;
      border-bottom: 1px solid var(--border-light);
    }

    .sender-avatar {
      width: 42px;
      height: 42px;
      border-radius: var(--radius-full);
      background: linear-gradient(135deg, #3b82f6, #1d4ed8);
      color: #ffffff;
      font-size: 17px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .meta-details {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .sender-row {
      display: flex;
      align-items: baseline;
      gap: 8px;
      flex-wrap: wrap;
    }

    .sender-name {
      font-size: 15px;
      font-weight: 700;
      color: var(--text-main);
    }

    .sender-email {
      font-size: 13px;
      color: var(--text-muted);
    }

    .email-time {
      margin-left: auto;
      font-size: 12.5px;
      color: var(--text-secondary);
    }

    .recipient-row {
      font-size: 13px;
      color: var(--text-secondary);
    }

    .rec-label {
      color: var(--text-muted);
      margin-right: 4px;
    }

    .body-content {
      font-size: 14.5px;
      line-height: 1.7;
      color: #1e293b;
      margin-bottom: 32px;
      min-height: 120px;
    }

    .rendered-html {
      word-break: break-word;
    }

    .attachments-section {
      margin-bottom: 32px;
      padding: 16px;
      background-color: var(--bg-app);
      border-radius: var(--radius-lg);
      border: 1px solid var(--border-subtle);
    }

    .att-heading {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13.5px;
      font-weight: 700;
      color: var(--text-main);
      margin-bottom: 12px;
    }

    .att-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 12px;
    }

    .att-card {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      background: #ffffff;
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-xs);
    }

    .att-icon-box {
      width: 34px;
      height: 34px;
      background-color: var(--primary-light);
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--primary);
    }

    .att-info {
      flex: 1;
      overflow: hidden;
    }

    .att-name {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-main);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .att-size {
      font-size: 11.5px;
      color: var(--text-muted);
    }

    .att-download-btn {
      padding: 6px;
      border-radius: var(--radius-sm);
    }

    .action-footer {
      display: flex;
      gap: 12px;
      padding-top: 20px;
      border-top: 1px solid var(--border-light);
    }

    .action-btn {
      padding: 8px 18px;
      border-radius: var(--radius-full);
      font-weight: 600;
    }

    .starred {
      color: var(--color-star) !important;
    }

    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 100px 20px;
      color: var(--text-secondary);
    }

    .spinner {
      font-size: 32px;
      color: var(--primary);
      margin-bottom: 12px;
    }
  `]
})
export class EmailDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private emailService = inject(EmailService);
  private toastService = inject(ToastService);

  email = signal<EmailDetail | null>(null);
  isLoading = signal<boolean>(true);

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.loadEmail(id);
      }
    });
  }

  loadEmail(id: string): void {
    this.isLoading.set(true);
    this.emailService.getEmailById(id).subscribe({
      next: (data) => {
        this.email.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.toastService.error('Email could not be found.');
        this.goBack();
      }
    });
  }

  goBack(): void {
    const f = this.email()?.folder || 'inbox';
    this.router.navigate([`/${f}`]);
  }

  markUnread(): void {
    const current = this.email();
    if (!current) return;
    this.emailService.markAsRead(current.id, false).subscribe({
      next: () => {
        this.toastService.info('Conversation marked as unread.');
        this.goBack();
      }
    });
  }

  deleteEmail(): void {
    const current = this.email();
    if (!current) return;
    this.emailService.deleteEmail(current.id).subscribe({
      next: () => {
        this.toastService.info('Conversation deleted.');
        this.goBack();
      },
      error: () => {
        this.toastService.error('Failed to delete email.');
      }
    });
  }

  toggleStar(): void {
    const current = this.email();
    if (!current) return;
    current.isStarred = !current.isStarred;
    this.emailService.toggleStar(current.id).subscribe();
  }

  reply(): void {
    const current = this.email();
    if (!current) return;

    const replyTo = [current.from.address];
    const quotedBody = `<br/><br/>On ${this.formatFullDate(current.createdAt)}, ${current.from.name || current.from.address} wrote:<br/><blockquote style="border-left: 2px solid #2563eb; padding-left: 10px; margin-left: 0; color: #475569;">${current.body}</blockquote>`;

    this.emailService.openCompose({
      to: replyTo,
      subject: current.subject.startsWith('Re:') ? current.subject : `Re: ${current.subject}`,
      body: quotedBody,
      inReplyTo: current.messageId || current.id,
      isReply: true,
      replyEmailId: current.id
    });
  }

  forward(): void {
    const current = this.email();
    if (!current) return;

    const forwardedBody = `<br/><br/>---------- Forwarded message ---------<br/>From: ${current.from.name || current.from.address} &lt;${current.from.address}&gt;<br/>Date: ${this.formatFullDate(current.createdAt)}<br/>Subject: ${current.subject}<br/>To: ${this.formatRecipientList(current.to)}<br/><br/>${current.body}`;

    this.emailService.openCompose({
      to: [],
      subject: current.subject.startsWith('Fwd:') ? current.subject : `Fwd: ${current.subject}`,
      body: forwardedBody,
      isForward: true,
      replyEmailId: current.id
    });
  }

  downloadAttachment(att: { id: string; fileName: string }): void {
    const current = this.email();
    if (!current) return;
    const url = this.emailService.downloadAttachmentUrl(current.id, att.id);
    window.open(url, '_blank');
  }

  getSenderInitial(): string {
    const name = this.email()?.from.name || this.email()?.from.address;
    return name ? name.charAt(0).toUpperCase() : 'M';
  }

  formatRecipientList(list: { name: string; address: string }[]): string {
    if (!list || list.length === 0) return '';
    return list.map(r => r.name ? `${r.name} <${r.address}>` : r.address).join(', ');
  }

  formatFullDate(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }

  formatBytes(bytes: number): string {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
}
