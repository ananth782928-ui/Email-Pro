export interface EmailAddress {
  name: string;
  address: string;
}

export interface EmailAttachment {
  id: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  base64Data?: string;
}

export interface EmailSummary {
  id: string;
  from: EmailAddress;
  to: EmailAddress[];
  subject: string;
  snippet: string;
  createdAt: string;
  sentAt?: string | null;
  isRead: boolean;
  isStarred: boolean;
  folder: 'inbox' | 'sent' | 'drafts' | 'trash';
  deliveryStatus: 'Sent' | 'Delivered' | 'Failed' | 'Received' | 'Draft';
  deliveryError?: string | null;
  hasAttachments: boolean;
}

export interface EmailDetail extends EmailSummary {
  cc: EmailAddress[];
  bcc: EmailAddress[];
  body: string;
  attachments: EmailAttachment[];
  messageId?: string | null;
  inReplyTo?: string | null;
}

export interface EmailListResponse {
  items: EmailSummary[];
  totalCount: number;
  page: number;
  pageSize: number;
  unreadCount: number;
}

export interface SendEmailPayload {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  inReplyTo?: string | null;
  attachments?: {
    fileName: string;
    contentType: string;
    sizeBytes: number;
    base64Data: string;
  }[];
}

export interface SendEmailResult {
  success: boolean;
  emailId: string;
  deliveryStatus: 'Sent' | 'Failed' | 'Delivered';
  message: string;
  error?: string | null;
}

export interface FolderCounts {
  inboxUnread: number;
  sentTotal: number;
}

export interface SyncImapResult {
  success: boolean;
  fetchedCount: number;
  message: string;
}
