import { Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { EmailService } from '../../services/email.service';
import { ToastService } from '../../services/toast.service';
import { EmailSummary } from '../../models/email.model';

@Component({
  selector: 'app-email-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="mail-container">
      <!-- Toolbar -->
      <div class="mail-toolbar">
        <div class="toolbar-left">
          <label class="checkbox-container">
            <input 
              type="checkbox" 
              [checked]="allSelected()" 
              (change)="toggleSelectAll()" />
            <span class="custom-checkbox"></span>
          </label>

          <button type="button" class="btn-icon" (click)="loadEmails()" title="Refresh">
            <span class="material-symbols-outlined" [class.animate-spin]="isLoading()">refresh</span>
          </button>

          @if (selectedIds().size > 0) {
            <button 
              type="button" 
              class="btn-icon" 
              (click)="markSelectedRead(true)" 
              title="Mark as read">
              <span class="material-symbols-outlined">mark_email_read</span>
            </button>

            <button 
              type="button" 
              class="btn-icon" 
              (click)="markSelectedRead(false)" 
              title="Mark as unread">
              <span class="material-symbols-outlined">mark_email_unread</span>
            </button>

            <button 
              type="button" 
              class="btn-icon text-danger" 
              (click)="deleteSelected()" 
              title="Delete selected">
              <span class="material-symbols-outlined">delete</span>
            </button>
          }

          <!-- Filter Unread Toggle (Inbox only) -->
          @if (folder() === 'inbox') {
            <div class="filter-pills">
              <button 
                type="button" 
                class="filter-pill" 
                [class.active]="!unreadOnly()" 
                (click)="setUnreadFilter(false)">
                All
              </button>
              <button 
                type="button" 
                class="filter-pill" 
                [class.active]="unreadOnly()" 
                (click)="setUnreadFilter(true)">
                Unread
              </button>
            </div>
          }
        </div>

        <div class="toolbar-right">
          <span class="pagination-info">
            {{ totalCount() === 0 ? '0 of 0' : ((page() - 1) * pageSize() + 1) + '–' + getEndItem() + ' of ' + totalCount() }}
          </span>

          <button 
            type="button" 
            class="btn-icon" 
            [disabled]="page() <= 1" 
            (click)="prevPage()" 
            title="Newer">
            <span class="material-symbols-outlined">chevron_left</span>
          </button>

          <button 
            type="button" 
            class="btn-icon" 
            [disabled]="getEndItem() >= totalCount()" 
            (click)="nextPage()" 
            title="Older">
            <span class="material-symbols-outlined">chevron_right</span>
          </button>
        </div>
      </div>

      <!-- Search Notice Banner if query active -->
      @if (emailService.searchQuery()) {
        <div class="search-banner">
          <span>Search results for: <strong>"{{ emailService.searchQuery() }}"</strong></span>
          <button type="button" class="btn-link" (click)="clearSearch()">Clear search</button>
        </div>
      }

      <!-- Email List Table / Rows -->
      <div class="mail-list-body">
        @if (isLoading()) {
          <div class="loading-state">
            <span class="material-symbols-outlined animate-spin spinner">progress_activity</span>
            <p>Loading your messages...</p>
          </div>
        } @else if (emails().length === 0) {
          <div class="empty-state">
            <div class="empty-icon-wrap">
              <span class="material-symbols-outlined">
                {{ folder() === 'inbox' ? 'move_to_inbox' : 'send' }}
              </span>
            </div>
            <h3>{{ folder() === 'inbox' ? 'Your inbox is empty' : 'No sent messages' }}</h3>
            <p>
              {{ folder() === 'inbox' 
                ? 'Messages you receive will show up here. You can also sync mail via IMAP.' 
                : 'Emails you send to real addresses or teammates will be tracked here.' }}
            </p>
          </div>
        } @else {
          <div class="mail-table">
            @for (email of emails(); track email.id) {
              <div 
                class="mail-row" 
                [class.unread]="!email.isRead && folder() === 'inbox'"
                [class.selected]="selectedIds().has(email.id)"
                (click)="openEmail(email)">
                
                <!-- Selection Checkbox -->
                <div class="cell-check" (click)="$event.stopPropagation()">
                  <label class="checkbox-container">
                    <input 
                      type="checkbox" 
                      [checked]="selectedIds().has(email.id)" 
                      (change)="toggleSelect(email.id)" />
                    <span class="custom-checkbox"></span>
                  </label>
                </div>

                <!-- Star button -->
                <div class="cell-star" (click)="toggleStar(email, $event)">
                  <button type="button" class="star-btn" [class.starred]="email.isStarred" title="Star message">
                    <span class="material-symbols-outlined" [class.filled]="email.isStarred">star</span>
                  </button>
                </div>

                <!-- Sender (Inbox) or Recipient (Sent) -->
                <div class="cell-sender">
                  @if (folder() === 'inbox') {
                    <span class="sender-name" [title]="email.from.address">
                      {{ email.from.name || email.from.address }}
                    </span>
                  } @else {
                    <span class="sender-name">
                      To: {{ formatRecipients(email) }}
                    </span>
                  }
                </div>

                <!-- Subject & Snippet Preview -->
                <div class="cell-content">
                  <span class="mail-subject">{{ email.subject }}</span>
                  <span class="mail-divider">—</span>
                  <span class="mail-snippet">{{ email.snippet }}</span>
                </div>

                <!-- Delivery Badge (For Sent folder or failed deliveries) -->
                @if (folder() === 'sent') {
                  <div class="cell-status">
                    @if (email.deliveryStatus === 'Sent' || email.deliveryStatus === 'Delivered') {
                      <span class="badge-status status-sent">Sent</span>
                    } @else if (email.deliveryStatus === 'Failed') {
                      <span class="badge-status status-failed" [title]="email.deliveryError || 'Delivery failed'">
                        Delivery Failed
                      </span>
                    }
                  </div>
                }

                <!-- Attachment Clip -->
                <div class="cell-attachment">
                  @if (email.hasAttachments) {
                    <span class="material-symbols-outlined att-icon" title="Has attachment">attachment</span>
                  }
                </div>

                <!-- Date -->
                <div class="cell-date">
                  {{ formatDate(email.createdAt) }}
                </div>

                <!-- Hover Quick Actions -->
                <div class="cell-actions" (click)="$event.stopPropagation()">
                  <button 
                    type="button" 
                    class="action-btn" 
                    (click)="toggleRead(email)" 
                    [title]="email.isRead ? 'Mark as unread' : 'Mark as read'">
                    <span class="material-symbols-outlined">
                      {{ email.isRead ? 'mark_email_unread' : 'mark_email_read' }}
                    </span>
                  </button>

                  <button 
                    type="button" 
                    class="action-btn text-danger" 
                    (click)="deleteEmail(email)" 
                    title="Delete message">
                    <span class="material-symbols-outlined">delete</span>
                  </button>
                </div>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .mail-container {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: #ffffff;
      overflow: hidden;
    }

    .mail-toolbar {
      height: 48px;
      padding: 0 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid var(--border-subtle);
      background-color: #ffffff;
      flex-shrink: 0;
    }

    .toolbar-left, .toolbar-right {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .filter-pills {
      display: flex;
      background-color: var(--bg-subtle);
      border-radius: var(--radius-full);
      padding: 2px;
      margin-left: 12px;
    }

    .filter-pill {
      border: none;
      background: transparent;
      padding: 3px 12px;
      font-size: 12px;
      font-weight: 600;
      color: var(--text-secondary);
      border-radius: var(--radius-full);
      cursor: pointer;
      transition: all var(--transition-fast);
      font-family: inherit;
    }

    .filter-pill.active {
      background: #ffffff;
      color: var(--primary);
      box-shadow: var(--shadow-xs);
    }

    .pagination-info {
      font-size: 12.5px;
      color: var(--text-secondary);
      margin-right: 4px;
    }

    .search-banner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 16px;
      background-color: var(--primary-light);
      border-bottom: 1px solid var(--primary-border);
      font-size: 13px;
      color: var(--primary-dark);
    }

    .btn-link {
      background: transparent;
      border: none;
      color: var(--primary);
      font-weight: 600;
      text-decoration: underline;
      cursor: pointer;
    }

    .mail-list-body {
      flex: 1;
      overflow-y: auto;
    }

    .mail-table {
      display: flex;
      flex-direction: column;
    }

    .mail-row {
      display: flex;
      align-items: center;
      height: 44px;
      padding: 0 16px;
      border-bottom: 1px solid var(--border-light);
      cursor: pointer;
      transition: background var(--transition-fast);
      user-select: none;
      position: relative;
    }

    .mail-row:hover {
      background-color: var(--bg-hover);
      box-shadow: inset 1px 0 0 #dadce0, inset -1px 0 0 #dadce0, 0 1px 2px 0 rgba(60,64,67,.3), 0 1px 3px 1px rgba(60,64,67,.15);
      z-index: 2;
    }

    .mail-row.unread {
      background-color: #ffffff;
      font-weight: 700;
    }

    .mail-row.unread .sender-name,
    .mail-row.unread .mail-subject {
      color: var(--text-main);
      font-weight: 700;
    }

    .mail-row:not(.unread) {
      background-color: #fafbfc;
    }

    .mail-row:not(.unread) .sender-name {
      color: var(--text-secondary);
      font-weight: 500;
    }

    .mail-row.selected {
      background-color: #e8f0fe !important;
    }

    .cell-check {
      width: 32px;
      display: flex;
      align-items: center;
    }

    .cell-star {
      width: 32px;
      display: flex;
      align-items: center;
    }

    .star-btn {
      background: transparent;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      display: flex;
      padding: 4px;
      border-radius: var(--radius-full);
      transition: color var(--transition-fast);
    }

    .star-btn:hover {
      color: #64748b;
    }

    .star-btn.starred {
      color: var(--color-star);
    }

    .cell-sender {
      width: 200px;
      padding-right: 16px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 13.5px;
      flex-shrink: 0;
    }

    .cell-content {
      flex: 1;
      display: flex;
      align-items: center;
      overflow: hidden;
      white-space: nowrap;
      font-size: 13.5px;
      padding-right: 16px;
    }

    .mail-subject {
      color: var(--text-main);
      font-weight: 500;
    }

    .mail-divider {
      margin: 0 6px;
      color: var(--text-muted);
    }

    .mail-snippet {
      color: var(--text-muted);
      overflow: hidden;
      text-overflow: ellipsis;
      font-weight: 400;
    }

    .cell-status {
      margin-right: 12px;
      flex-shrink: 0;
    }

    .badge-status {
      font-size: 11px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: var(--radius-full);
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

    .cell-attachment {
      width: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .att-icon {
      font-size: 17px;
      color: var(--text-muted);
    }

    .cell-date {
      width: 80px;
      text-align: right;
      font-size: 12px;
      color: var(--text-secondary);
      font-weight: 500;
      flex-shrink: 0;
    }

    .cell-actions {
      display: none;
      position: absolute;
      right: 16px;
      background: linear-gradient(90deg, transparent, #ffffff 20%);
      padding-left: 20px;
      gap: 4px;
    }

    .mail-row:hover .cell-actions {
      display: flex;
    }

    .action-btn {
      background: transparent;
      border: none;
      color: var(--text-secondary);
      cursor: pointer;
      display: flex;
      padding: 6px;
      border-radius: var(--radius-full);
    }

    .action-btn:hover {
      background-color: var(--bg-hover);
      color: var(--text-main);
    }

    .action-btn.text-danger:hover {
      color: var(--color-error);
      background-color: var(--color-error-bg);
    }

    /* Checkbox Styles */
    .checkbox-container {
      position: relative;
      cursor: pointer;
      display: flex;
      align-items: center;
    }

    .checkbox-container input {
      position: absolute;
      opacity: 0;
      cursor: pointer;
    }

    .custom-checkbox {
      width: 17px;
      height: 17px;
      background-color: #ffffff;
      border: 1.5px solid var(--border-strong);
      border-radius: 4px;
      transition: all var(--transition-fast);
      display: inline-block;
    }

    .checkbox-container input:checked ~ .custom-checkbox {
      background-color: var(--primary);
      border-color: var(--primary);
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 16 16' fill='white' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z'/%3E%3C/svg%3E");
      background-position: center;
      background-repeat: no-repeat;
    }

    .loading-state, .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 80px 20px;
      text-align: center;
      color: var(--text-secondary);
    }

    .spinner {
      font-size: 32px;
      color: var(--primary);
      margin-bottom: 12px;
    }

    .empty-icon-wrap {
      width: 64px;
      height: 64px;
      border-radius: var(--radius-full);
      background-color: var(--primary-light);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--primary);
      margin-bottom: 16px;
    }

    .empty-icon-wrap .material-symbols-outlined {
      font-size: 32px;
    }

    .empty-state h3 {
      font-size: 16px;
      font-weight: 700;
      color: var(--text-main);
      margin-bottom: 6px;
    }

    .empty-state p {
      font-size: 13.5px;
      max-width: 360px;
      color: var(--text-muted);
    }
  `]
})
export class EmailListComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  emailService = inject(EmailService);
  private toastService = inject(ToastService);

  folder = signal<'inbox' | 'sent'>('inbox');
  emails = signal<EmailSummary[]>([]);
  totalCount = signal<number>(0);
  page = signal<number>(1);
  pageSize = signal<number>(25);
  unreadOnly = signal<boolean>(false);
  isLoading = signal<boolean>(false);
  selectedIds = signal<Set<string>>(new Set());

  allSelected = computed(() => {
    const list = this.emails();
    return list.length > 0 && list.every(e => this.selectedIds().has(e.id));
  });

  constructor() {
    // Re-load when search query signal changes
    effect(() => {
      const q = this.emailService.searchQuery();
      this.loadEmails();
    });
  }

  ngOnInit(): void {
    this.route.data.subscribe(data => {
      const f = (data['folder'] as 'inbox' | 'sent') || 'inbox';
      this.folder.set(f);
      this.emailService.activeFolder.set(f);
      this.selectedIds.set(new Set());
      this.loadEmails();
    });
  }

  loadEmails(): void {
    this.isLoading.set(true);
    this.emailService.getEmails(
      this.folder(),
      this.emailService.searchQuery(),
      this.unreadOnly(),
      this.page(),
      this.pageSize()
    ).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        this.emails.set(res.items);
        this.totalCount.set(res.totalCount);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.toastService.error('Failed to load messages.');
      }
    });
  }

  setUnreadFilter(unread: boolean): void {
    this.unreadOnly.set(unread);
    this.page.set(1);
    this.loadEmails();
  }

  getEndItem(): number {
    return Math.min(this.page() * this.pageSize(), this.totalCount());
  }

  prevPage(): void {
    if (this.page() > 1) {
      this.page.update(p => p - 1);
      this.loadEmails();
    }
  }

  nextPage(): void {
    if (this.getEndItem() < this.totalCount()) {
      this.page.update(p => p + 1);
      this.loadEmails();
    }
  }

  clearSearch(): void {
    this.emailService.searchQuery.set('');
  }

  toggleSelect(id: string): void {
    const current = new Set(this.selectedIds());
    if (current.has(id)) {
      current.delete(id);
    } else {
      current.add(id);
    }
    this.selectedIds.set(current);
  }

  toggleSelectAll(): void {
    if (this.allSelected()) {
      this.selectedIds.set(new Set());
    } else {
      const allIds = new Set(this.emails().map(e => e.id));
      this.selectedIds.set(allIds);
    }
  }

  openEmail(email: EmailSummary): void {
    this.router.navigate(['/mail', email.id]);
  }

  toggleStar(email: EmailSummary, event: MouseEvent): void {
    event.stopPropagation();
    email.isStarred = !email.isStarred;
    this.emailService.toggleStar(email.id).subscribe();
  }

  toggleRead(email: EmailSummary): void {
    const newStatus = !email.isRead;
    email.isRead = newStatus;
    this.emailService.markAsRead(email.id, newStatus).subscribe();
  }

  deleteEmail(email: EmailSummary): void {
    this.emailService.deleteEmail(email.id).subscribe({
      next: () => {
        this.emails.update(list => list.filter(e => e.id !== email.id));
        this.totalCount.update(c => Math.max(0, c - 1));
        this.toastService.info('Conversation moved to trash.');
      },
      error: () => {
        this.toastService.error('Failed to delete email.');
      }
    });
  }

  markSelectedRead(isRead: boolean): void {
    const ids = Array.from(this.selectedIds());
    ids.forEach(id => {
      this.emailService.markAsRead(id, isRead).subscribe();
      const item = this.emails().find(e => e.id === id);
      if (item) item.isRead = isRead;
    });
    this.toastService.info(`Marked ${ids.length} messages as ${isRead ? 'read' : 'unread'}.`);
    this.selectedIds.set(new Set());
  }

  deleteSelected(): void {
    const ids = Array.from(this.selectedIds());
    ids.forEach(id => {
      this.emailService.deleteEmail(id).subscribe();
    });
    this.emails.update(list => list.filter(e => !this.selectedIds().has(e.id)));
    this.totalCount.update(c => Math.max(0, c - ids.length));
    this.toastService.info(`Deleted ${ids.length} conversations.`);
    this.selectedIds.set(new Set());
  }

  formatRecipients(email: EmailSummary): string {
    if (!email.to || email.to.length === 0) return '(no recipient)';
    return email.to.map(t => t.name || t.address).join(', ');
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
}
