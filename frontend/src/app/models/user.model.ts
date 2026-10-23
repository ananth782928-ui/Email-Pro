export interface User {
  id: string;
  email: string;
  fullName: string;
  hasCustomSmtp?: boolean;
  hasCustomImap?: boolean;
  smtpSettings?: UserSmtpSettings;
  imapSettings?: UserImapSettings;
}

export interface UserSmtpSettings {
  host: string;
  port: number;
  useSsl: boolean;
  username: string;
  fromEmail: string;
  fromName: string;
  password?: string;
}

export interface UserImapSettings {
  host: string;
  port: number;
  useSsl: boolean;
  username: string;
  password?: string;
  lastSyncAt?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface UpdateSettingsPayload {
  smtp?: Partial<UserSmtpSettings>;
  imap?: Partial<UserImapSettings>;
}
