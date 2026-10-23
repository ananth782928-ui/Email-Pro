import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { 
  EmailDetail, 
  EmailListResponse, 
  FolderCounts, 
  SendEmailPayload, 
  SendEmailResult, 
  SyncImapResult 
} from '../models/email.model';

@Injectable({
  providedIn: 'root'
})
export class EmailService {
  private http = inject(HttpClient);

  activeFolder = signal<'inbox' | 'sent'>('inbox');
  searchQuery = signal<string>('');
  unreadOnly = signal<boolean>(false);
  folderCounts = signal<FolderCounts>({ inboxUnread: 0, sentTotal: 0 });
  composeOpen = signal<boolean>(false);
  composeInitialData = signal<{
    to?: string[];
    subject?: string;
    body?: string;
    inReplyTo?: string;
    isReply?: boolean;
    isForward?: boolean;
    replyEmailId?: string;
  } | null>(null);

  getEmails(
    folder = this.activeFolder(),
    search = this.searchQuery(),
    unreadOnly = this.unreadOnly(),
    page = 1,
    pageSize = 25
  ): Observable<EmailListResponse> {
    let params = new HttpParams()
      .set('folder', folder)
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    if (search && search.trim()) {
      params = params.set('search', search.trim());
    }

    if (unreadOnly) {
      params = params.set('unreadOnly', 'true');
    }

    return this.http.get<EmailListResponse>(`${environment.apiUrl}/emails`, { params });
  }

  getFolderCounts(): Observable<FolderCounts> {
    return this.http.get<FolderCounts>(`${environment.apiUrl}/emails/counts`).pipe(
      tap(counts => this.folderCounts.set(counts))
    );
  }

  getEmailById(id: string): Observable<EmailDetail> {
    return this.http.get<EmailDetail>(`${environment.apiUrl}/emails/${id}`).pipe(
      tap(() => this.getFolderCounts().subscribe())
    );
  }

  sendEmail(payload: SendEmailPayload): Observable<SendEmailResult> {
    return this.http.post<SendEmailResult>(`${environment.apiUrl}/emails/send`, payload).pipe(
      tap(() => this.getFolderCounts().subscribe())
    );
  }

  replyEmail(id: string, payload: SendEmailPayload): Observable<SendEmailResult> {
    return this.http.post<SendEmailResult>(`${environment.apiUrl}/emails/${id}/reply`, payload).pipe(
      tap(() => this.getFolderCounts().subscribe())
    );
  }

  forwardEmail(id: string, payload: SendEmailPayload): Observable<SendEmailResult> {
    return this.http.post<SendEmailResult>(`${environment.apiUrl}/emails/${id}/forward`, payload).pipe(
      tap(() => this.getFolderCounts().subscribe())
    );
  }

  markAsRead(id: string, isRead = true): Observable<{ success: boolean; isRead: boolean }> {
    return this.http.patch<{ success: boolean; isRead: boolean }>(`${environment.apiUrl}/emails/${id}/read`, { isRead }).pipe(
      tap(() => this.getFolderCounts().subscribe())
    );
  }

  toggleStar(id: string): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${environment.apiUrl}/emails/${id}/star`, {});
  }

  deleteEmail(id: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${environment.apiUrl}/emails/${id}`).pipe(
      tap(() => this.getFolderCounts().subscribe())
    );
  }

  syncImap(): Observable<SyncImapResult> {
    return this.http.post<SyncImapResult>(`${environment.apiUrl}/emails/sync-imap`, {}).pipe(
      tap(() => this.getFolderCounts().subscribe())
    );
  }

  downloadAttachmentUrl(emailId: string, attachmentId: string): string {
    return `${environment.apiUrl}/emails/${emailId}/attachments/${attachmentId}`;
  }

  openCompose(data?: {
    to?: string[];
    subject?: string;
    body?: string;
    inReplyTo?: string;
    isReply?: boolean;
    isForward?: boolean;
    replyEmailId?: string;
  }): void {
    this.composeInitialData.set(data || null);
    this.composeOpen.set(true);
  }

  closeCompose(): void {
    this.composeOpen.set(false);
    this.composeInitialData.set(null);
  }
}
