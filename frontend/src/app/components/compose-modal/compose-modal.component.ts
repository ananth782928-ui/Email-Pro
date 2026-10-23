import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { EmailService } from '../../services/email.service';
import { ToastService } from '../../services/toast.service';

interface LocalAttachment {
  fileName: string;
  contentType: string;
  sizeBytes: number;
  base64Data: string;
}

@Component({
  selector: 'app-compose-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="compose-window" [class.minimized]="isMinimized()" [class.maximized]="isMaximized()">
      <!-- Window Header -->
      <div class="window-header">
        <span class="window-title">{{ getWindowTitle() }}</span>
        <div class="window-controls">
          <button type="button" class="ctrl-btn" (click)="toggleMinimize()" title="Minimize">
            <span class="material-symbols-outlined">minimize</span>
          </button>
          <button type="button" class="ctrl-btn" (click)="toggleMaximize()" title="Maximize">
            <span class="material-symbols-outlined">{{ isMaximized() ? 'close_fullscreen' : 'open_in_full' }}</span>
          </button>
          <button type="button" class="ctrl-btn" (click)="close()" title="Close">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
      </div>

      <!-- Window Body (Hidden if minimized) -->
      @if (!isMinimized()) {
        <form [formGroup]="composeForm" (ngSubmit)="send()" class="window-form">
          <!-- Recipients: To -->
          <div class="form-row">
            <label class="row-label" for="toInput">To</label>
            <input 
              id="toInput"
              type="text" 
              formControlName="to" 
              placeholder="Recipients (comma-separated e.g. name@example.com)"
              class="row-input" />
            <div class="cc-toggles">
              @if (!showCc()) {
                <button type="button" class="toggle-link" (click)="showCc.set(true)">Cc</button>
              }
              @if (!showBcc()) {
                <button type="button" class="toggle-link" (click)="showBcc.set(true)">Bcc</button>
              }
            </div>
          </div>

          <!-- Recipients: CC -->
          @if (showCc()) {
            <div class="form-row">
              <label class="row-label" for="ccInput">Cc</label>
              <input 
                id="ccInput"
                type="text" 
                formControlName="cc" 
                placeholder="Cc recipients (comma-separated)"
                class="row-input" />
            </div>
          }

          <!-- Recipients: BCC -->
          @if (showBcc()) {
            <div class="form-row">
              <label class="row-label" for="bccInput">Bcc</label>
              <input 
                id="bccInput"
                type="text" 
                formControlName="bcc" 
                placeholder="Bcc recipients (comma-separated)"
                class="row-input" />
            </div>
          }

          <!-- Subject -->
          <div class="form-row">
            <input 
              type="text" 
              formControlName="subject" 
              placeholder="Subject"
              class="row-input subject-input" />
          </div>

          <!-- Message Body -->
          <div class="body-wrapper">
            <textarea 
              formControlName="body" 
              placeholder="Write your email message here..."
              class="message-textarea"></textarea>
          </div>

          <!-- Attachments Chip List -->
          @if (attachments().length > 0) {
            <div class="attachments-bar">
              @for (att of attachments(); track att.fileName; let i = $index) {
                <div class="att-chip">
                  <span class="material-symbols-outlined chip-icon">attach_file</span>
                  <span class="chip-name" [title]="att.fileName">{{ att.fileName }}</span>
                  <span class="chip-size">({{ formatBytes(att.sizeBytes) }})</span>
                  <button type="button" class="chip-remove" (click)="removeAttachment(i)">
                    <span class="material-symbols-outlined">close</span>
                  </button>
                </div>
              }
            </div>
          }

          <!-- Footer Actions -->
          <div class="window-footer">
            <div class="footer-left">
              <button 
                type="submit" 
                class="btn btn-primary send-btn" 
                [disabled]="isSending() || composeForm.invalid">
                @if (isSending()) {
                  <span class="material-symbols-outlined animate-spin">progress_activity</span>
                  <span>Sending...</span>
                } @else {
                  <span>Send</span>
                  <span class="material-symbols-outlined">send</span>
                }
              </button>

              <!-- Attachment Upload Button -->
              <button 
                type="button" 
                class="btn-icon att-btn" 
                (click)="fileInput.click()" 
                title="Attach files">
                <span class="material-symbols-outlined">attach_file</span>
              </button>
              <input 
                #fileInput 
                type="file" 
                multiple 
                (change)="onFilesSelected($event)" 
                style="display: none;" />
            </div>

            <div class="footer-right">
              <button type="button" class="btn-icon text-danger" (click)="close()" title="Discard draft">
                <span class="material-symbols-outlined">delete</span>
              </button>
            </div>
          </div>
        </form>
      }
    </div>
  `,
  styles: [`
    .compose-window {
      position: fixed;
      bottom: 0;
      right: 32px;
      width: 580px;
      background: #ffffff;
      border-radius: var(--radius-lg) var(--radius-lg) 0 0;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
      border: 1px solid var(--border-subtle);
      border-bottom: none;
      display: flex;
      flex-direction: column;
      z-index: 2000;
      overflow: hidden;
      transition: all var(--transition-normal);
    }

    .compose-window.minimized {
      height: 44px;
    }

    .compose-window.maximized {
      top: 32px;
      left: 32px;
      right: 32px;
      bottom: 0;
      width: auto;
      border-radius: var(--radius-lg) var(--radius-lg) 0 0;
    }

    .window-header {
      height: 44px;
      background: #f1f5f9;
      padding: 0 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid var(--border-subtle);
      cursor: default;
      user-select: none;
    }

    .window-title {
      font-size: 13.5px;
      font-weight: 700;
      color: var(--text-main);
    }

    .window-controls {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .ctrl-btn {
      background: transparent;
      border: none;
      color: var(--text-secondary);
      cursor: pointer;
      display: flex;
      padding: 4px;
      border-radius: 4px;
    }

    .ctrl-btn:hover {
      background-color: rgba(0, 0, 0, 0.08);
      color: var(--text-main);
    }

    .ctrl-btn .material-symbols-outlined {
      font-size: 16px;
    }

    .window-form {
      display: flex;
      flex-direction: column;
      flex: 1;
      height: 460px;
    }

    .compose-window.maximized .window-form {
      height: calc(100vh - 80px);
    }

    .form-row {
      display: flex;
      align-items: center;
      padding: 8px 16px;
      border-bottom: 1px solid var(--border-light);
      position: relative;
    }

    .row-label {
      width: 44px;
      font-size: 13px;
      color: var(--text-muted);
      font-weight: 500;
    }

    .row-input {
      flex: 1;
      border: none;
      background: transparent;
      outline: none;
      font-family: inherit;
      font-size: 13.5px;
      color: var(--text-main);
    }

    .subject-input {
      font-weight: 600;
      font-size: 14px;
      padding: 4px 0;
    }

    .cc-toggles {
      display: flex;
      gap: 8px;
    }

    .toggle-link {
      background: transparent;
      border: none;
      color: var(--text-muted);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      padding: 2px 4px;
    }

    .toggle-link:hover {
      color: var(--primary);
      text-decoration: underline;
    }

    .body-wrapper {
      flex: 1;
      display: flex;
      padding: 12px 16px;
    }

    .message-textarea {
      width: 100%;
      height: 100%;
      border: none;
      background: transparent;
      outline: none;
      font-family: inherit;
      font-size: 14px;
      line-height: 1.6;
      color: var(--text-main);
      resize: none;
    }

    .attachments-bar {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      padding: 8px 16px;
      background-color: var(--bg-app);
      border-top: 1px solid var(--border-light);
      max-height: 100px;
      overflow-y: auto;
    }

    .att-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      background: #ffffff;
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-full);
      font-size: 12px;
      color: var(--text-main);
    }

    .chip-icon {
      font-size: 14px;
      color: var(--primary);
    }

    .chip-name {
      max-width: 140px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-weight: 500;
    }

    .chip-size {
      color: var(--text-muted);
      font-size: 11px;
    }

    .chip-remove {
      background: transparent;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      display: flex;
      padding: 2px;
      border-radius: var(--radius-full);
    }

    .chip-remove:hover {
      color: var(--color-error);
    }

    .chip-remove .material-symbols-outlined {
      font-size: 14px;
    }

    .window-footer {
      height: 56px;
      padding: 0 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-top: 1px solid var(--border-subtle);
      background-color: #ffffff;
    }

    .footer-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .send-btn {
      padding: 8px 20px;
      border-radius: var(--radius-full);
      font-size: 13.5px;
    }

    .att-btn {
      padding: 8px;
      border-radius: var(--radius-full);
    }

    .att-btn:hover {
      background-color: var(--bg-hover);
      color: var(--primary);
    }
  `]
})
export class ComposeModalComponent implements OnInit {
  private fb = inject(FormBuilder);
  private emailService = inject(EmailService);
  private toastService = inject(ToastService);

  isMinimized = signal<boolean>(false);
  isMaximized = signal<boolean>(false);
  showCc = signal<boolean>(false);
  showBcc = signal<boolean>(false);
  isSending = signal<boolean>(false);
  attachments = signal<LocalAttachment[]>([]);

  composeForm = this.fb.group({
    to: ['', [Validators.required]],
    cc: [''],
    bcc: [''],
    subject: ['', [Validators.required]],
    body: ['']
  });

  ngOnInit(): void {
    const initial = this.emailService.composeInitialData();
    if (initial) {
      if (initial.to && initial.to.length > 0) {
        this.composeForm.patchValue({ to: initial.to.join(', ') });
      }
      if (initial.subject) {
        this.composeForm.patchValue({ subject: initial.subject });
      }
      if (initial.body) {
        // Strip basic HTML tags if quoting for plain textarea
        const plainText = initial.body.replace(/<br\s*\/?>/gi, '\n').replace(/<.*?>/g, '');
        this.composeForm.patchValue({ body: plainText });
      }
    }
  }

  getWindowTitle(): string {
    const initial = this.emailService.composeInitialData();
    if (initial?.isReply) return 'Reply Message';
    if (initial?.isForward) return 'Forward Message';
    return 'New Message';
  }

  toggleMinimize(): void {
    this.isMinimized.update(v => !v);
  }

  toggleMaximize(): void {
    this.isMaximized.update(v => !v);
  }

  close(): void {
    this.emailService.closeCompose();
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    Array.from(input.files).forEach(file => {
      // Check file size (e.g. max 15MB)
      if (file.size > 15 * 1024 * 1024) {
        this.toastService.error(`File "${file.name}" exceeds the 15MB size limit.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const resultStr = reader.result as string;
        // Extract base64 part
        const base64 = resultStr.split(',')[1] || '';
        this.attachments.update(curr => [
          ...curr,
          {
            fileName: file.name,
            contentType: file.type || 'application/octet-stream',
            sizeBytes: file.size,
            base64Data: base64
          }
        ]);
      };
      reader.readAsDataURL(file);
    });

    input.value = '';
  }

  removeAttachment(index: number): void {
    this.attachments.update(curr => curr.filter((_, i) => i !== index));
  }

  send(): void {
    if (this.composeForm.invalid) {
      this.composeForm.markAllAsTouched();
      return;
    }

    this.isSending.set(true);

    const val = this.composeForm.value;
    const toList = (val.to || '').split(',').map(s => s.trim()).filter(Boolean);
    const ccList = (val.cc || '').split(',').map(s => s.trim()).filter(Boolean);
    const bccList = (val.bcc || '').split(',').map(s => s.trim()).filter(Boolean);

    const payload = {
      to: toList,
      cc: ccList.length > 0 ? ccList : undefined,
      bcc: bccList.length > 0 ? bccList : undefined,
      subject: val.subject || '',
      body: (val.body || '').replace(/\n/g, '<br/>'),
      inReplyTo: this.emailService.composeInitialData()?.inReplyTo,
      attachments: this.attachments().map(a => ({
        fileName: a.fileName,
        contentType: a.contentType,
        sizeBytes: a.sizeBytes,
        base64Data: a.base64Data
      }))
    };

    const initial = this.emailService.composeInitialData();
    let request$;

    if (initial?.isReply && initial.replyEmailId) {
      request$ = this.emailService.replyEmail(initial.replyEmailId, payload);
    } else if (initial?.isForward && initial.replyEmailId) {
      request$ = this.emailService.forwardEmail(initial.replyEmailId, payload);
    } else {
      request$ = this.emailService.sendEmail(payload);
    }

    request$.subscribe({
      next: (res) => {
        this.isSending.set(false);
        if (res.success) {
          this.toastService.success(res.message || 'Email sent successfully via SMTP!');
        } else {
          // SMTP warning: transparent delivery status
          this.toastService.info(res.error || res.message || 'Email saved to Sent, but SMTP delivery failed.');
        }
        this.close();
      },
      error: (err) => {
        this.isSending.set(false);
        this.toastService.error(err.error?.message || 'Failed to dispatch email.');
      }
    });
  }

  formatBytes(bytes: number): string {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
}
