using System.Text.RegularExpressions;
using Backend.Data;
using Backend.DTOs;
using Backend.Models;
using MailKit.Net.Imap;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.IdentityModel.Tokens;
using MimeKit;
using MongoDB.Bson;
using MongoDB.Driver;

namespace Backend.Services;

public class EmailService : IEmailService
{
    private readonly MongoDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly ILogger<EmailService> _logger;

    public EmailService(MongoDbContext context, IConfiguration configuration, ILogger<EmailService> logger)
    {
        _context = context;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<EmailListResponse> GetEmailsAsync(string userId, string folder, string? search, bool? unreadOnly, int page, int pageSize)
    {
        if (page < 1) page = 1;
        if (pageSize < 1 || pageSize > 100) pageSize = 20;

        var normalizedFolder = string.IsNullOrWhiteSpace(folder) ? "inbox" : folder.Trim().ToLowerInvariant();

        var builder = Builders<EmailMessage>.Filter;
        var filter = builder.Eq(e => e.UserId, userId) & builder.Eq(e => e.Folder, normalizedFolder);

        if (unreadOnly == true)
        {
            filter &= builder.Eq(e => e.IsRead, false);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var searchPattern = new BsonRegularExpression(Regex.Escape(search.Trim()), "i");
            var searchFilter = builder.Or(
                builder.Regex(e => e.Subject, searchPattern),
                builder.Regex(e => e.Snippet, searchPattern),
                builder.Regex("from.address", searchPattern),
                builder.Regex("from.name", searchPattern),
                builder.ElemMatch(e => e.To, Builders<EmailAddress>.Filter.Regex(a => a.Address, searchPattern))
            );
            filter &= searchFilter;
        }

        var totalCount = (int)await _context.Emails.CountDocumentsAsync(filter);

        var items = await _context.Emails.Find(filter)
            .SortByDescending(e => e.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Limit(pageSize)
            .ToListAsync();

        var unreadFilter = builder.Eq(e => e.UserId, userId) & builder.Eq(e => e.Folder, normalizedFolder) & builder.Eq(e => e.IsRead, false);
        var unreadCount = (int)await _context.Emails.CountDocumentsAsync(unreadFilter);

        var dtos = items.Select(e => new EmailSummaryDto
        {
            Id = e.Id,
            From = e.From,
            To = e.To,
            Subject = string.IsNullOrWhiteSpace(e.Subject) ? "(no subject)" : e.Subject,
            Snippet = e.Snippet,
            CreatedAt = e.CreatedAt,
            SentAt = e.SentAt,
            IsRead = e.IsRead,
            IsStarred = e.IsStarred,
            Folder = e.Folder,
            DeliveryStatus = e.DeliveryStatus,
            DeliveryError = e.DeliveryError,
            HasAttachments = e.Attachments != null && e.Attachments.Count > 0
        }).ToList();

        return new EmailListResponse
        {
            Items = dtos,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize,
            UnreadCount = unreadCount
        };
    }

    public async Task<EmailDetailDto> GetEmailByIdAsync(string userId, string emailId)
    {
        var email = await _context.Emails.Find(e => e.Id == emailId && e.UserId == userId).FirstOrDefaultAsync();
        if (email == null)
        {
            throw new KeyNotFoundException("Email message not found.");
        }

        // Auto mark as read on view if in inbox
        if (!email.IsRead)
        {
            email.IsRead = true;
            await _context.Emails.UpdateOneAsync(
                e => e.Id == emailId && e.UserId == userId,
                Builders<EmailMessage>.Update.Set(e => e.IsRead, true)
            );
        }

        return new EmailDetailDto
        {
            Id = email.Id,
            From = email.From,
            To = email.To,
            Cc = email.Cc,
            Bcc = email.Bcc,
            Subject = string.IsNullOrWhiteSpace(email.Subject) ? "(no subject)" : email.Subject,
            Body = email.Body,
            Snippet = email.Snippet,
            CreatedAt = email.CreatedAt,
            SentAt = email.SentAt,
            IsRead = email.IsRead,
            IsStarred = email.IsStarred,
            Folder = email.Folder,
            DeliveryStatus = email.DeliveryStatus,
            DeliveryError = email.DeliveryError,
            HasAttachments = email.Attachments != null && email.Attachments.Count > 0,
            Attachments = email.Attachments ?? new List<EmailAttachment>(),
            MessageId = email.MessageId,
            InReplyTo = email.InReplyTo
        };
    }

    public async Task<SendEmailResult> SendEmailAsync(string userId, SendEmailRequest request)
    {
        var user = await _context.Users.Find(u => u.Id == userId).FirstOrDefaultAsync();
        if (user == null)
        {
            throw new UnauthorizedAccessException("User not found.");
        }

        if (request.To == null || request.To.Count == 0 || request.To.All(string.IsNullOrWhiteSpace))
        {
            throw new ArgumentException("At least one recipient address is required.");
        }

        var toAddresses = request.To
            .Where(t => !string.IsNullOrWhiteSpace(t))
            .Select(t => new EmailAddress(t.Trim()))
            .ToList();

        var ccAddresses = (request.Cc ?? new List<string>())
            .Where(c => !string.IsNullOrWhiteSpace(c))
            .Select(c => new EmailAddress(c.Trim()))
            .ToList();

        var bccAddresses = (request.Bcc ?? new List<string>())
            .Where(b => !string.IsNullOrWhiteSpace(b))
            .Select(b => new EmailAddress(b.Trim()))
            .ToList();

        var senderFromAddress = new EmailAddress(user.Email, user.FullName);
        if (user.SmtpSettings != null && !string.IsNullOrWhiteSpace(user.SmtpSettings.FromEmail))
        {
            senderFromAddress = new EmailAddress(user.SmtpSettings.FromEmail, 
                string.IsNullOrWhiteSpace(user.SmtpSettings.FromName) ? user.FullName : user.SmtpSettings.FromName);
        }

        var attachments = (request.Attachments ?? new List<EmailAttachmentDto>())
            .Select(a => new EmailAttachment
            {
                Id = Guid.NewGuid().ToString("N"),
                FileName = a.FileName,
                ContentType = string.IsNullOrWhiteSpace(a.ContentType) ? "application/octet-stream" : a.ContentType,
                SizeBytes = a.SizeBytes > 0 ? a.SizeBytes : (a.Base64Data.Length * 3 / 4),
                Base64Data = a.Base64Data
            }).ToList();

        var snippet = CreateSnippet(request.Body);
        var messageRfcId = $"<{Guid.NewGuid()}@{GetDomain(user.Email)}>";

        // Create the sent email record for the sender
        var sentEmail = new EmailMessage
        {
            UserId = userId,
            Folder = "sent",
            From = senderFromAddress,
            To = toAddresses,
            Cc = ccAddresses,
            Bcc = bccAddresses,
            Subject = request.Subject?.Trim() ?? string.Empty,
            Body = request.Body ?? string.Empty,
            Snippet = snippet,
            Attachments = attachments,
            IsRead = true,
            MessageId = messageRfcId,
            InReplyTo = request.InReplyTo,
            CreatedAt = DateTime.UtcNow
        };

        // Determine SMTP configuration (User settings take priority, then system settings)
        var (smtpHost, smtpPort, smtpUseSsl, smtpUser, smtpPass, hasSmtpConfig) = ResolveSmtpConfig(user);

        bool smtpSuccess = false;
        string? smtpErrorMessage = null;

        if (!hasSmtpConfig)
        {
            smtpErrorMessage = "SMTP credentials are not configured. To send live emails to external providers (Gmail, Outlook, Yahoo, etc.), please configure your SMTP host and password (or Gmail App Password) in Settings or appsettings.json.";
            sentEmail.DeliveryStatus = "Failed";
            sentEmail.DeliveryError = smtpErrorMessage;
        }
        else
        {
            try
            {
                _logger.LogInformation("Attempting SMTP delivery to {Recipients} via {Host}:{Port} (SSL={Ssl})", 
                    string.Join(", ", toAddresses.Select(a => a.Address)), smtpHost, smtpPort, smtpUseSsl);

                var mimeMessage = new MimeMessage();
                mimeMessage.From.Add(new MailboxAddress(senderFromAddress.Name, senderFromAddress.Address));

                foreach (var to in toAddresses)
                {
                    mimeMessage.To.Add(new MailboxAddress(to.Name, to.Address));
                }
                foreach (var cc in ccAddresses)
                {
                    mimeMessage.Cc.Add(new MailboxAddress(cc.Name, cc.Address));
                }
                foreach (var bcc in bccAddresses)
                {
                    mimeMessage.Bcc.Add(new MailboxAddress(bcc.Name, bcc.Address));
                }

                mimeMessage.Subject = sentEmail.Subject;
                mimeMessage.MessageId = messageRfcId;
                if (!string.IsNullOrWhiteSpace(request.InReplyTo))
                {
                    mimeMessage.InReplyTo = request.InReplyTo;
                }

                var bodyBuilder = new BodyBuilder();
                if (IsHtml(request.Body))
                {
                    bodyBuilder.HtmlBody = request.Body;
                    bodyBuilder.TextBody = StripHtml(request.Body ?? string.Empty);
                }
                else
                {
                    bodyBuilder.TextBody = request.Body ?? string.Empty;
                }

                foreach (var att in attachments)
                {
                    if (!string.IsNullOrWhiteSpace(att.Base64Data))
                    {
                        var dataBytes = Convert.FromBase64String(att.Base64Data);
                        bodyBuilder.Attachments.Add(att.FileName, dataBytes, ContentType.Parse(att.ContentType));
                    }
                }

                mimeMessage.Body = bodyBuilder.ToMessageBody();

                using var client = new SmtpClient();
                // Allow self-signed or test certificates in development if needed
                client.ServerCertificateValidationCallback = (s, c, h, e) => true;

                var socketOptions = smtpUseSsl 
                    ? (smtpPort == 465 ? SecureSocketOptions.SslOnConnect : SecureSocketOptions.StartTls) 
                    : SecureSocketOptions.Auto;

                await client.ConnectAsync(smtpHost, smtpPort, socketOptions);

                if (!string.IsNullOrWhiteSpace(smtpUser) && !string.IsNullOrWhiteSpace(smtpPass))
                {
                    await client.AuthenticateAsync(smtpUser, smtpPass);
                }

                await client.SendAsync(mimeMessage);
                await client.DisconnectAsync(true);

                smtpSuccess = true;
                sentEmail.DeliveryStatus = "Sent";
                sentEmail.SentAt = DateTime.UtcNow;
                sentEmail.DeliveryError = null;
                _logger.LogInformation("Email {Id} delivered successfully via SMTP.", sentEmail.Id);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "SMTP delivery failed for email to {Recipients}: {Message}", 
                    string.Join(", ", toAddresses.Select(a => a.Address)), ex.Message);
                smtpSuccess = false;
                smtpErrorMessage = $"SMTP delivery failed: {ex.Message}";
                sentEmail.DeliveryStatus = "Failed";
                sentEmail.DeliveryError = smtpErrorMessage;
            }
        }

        // Save into sender's sent folder
        await _context.Emails.InsertOneAsync(sentEmail);

        // Also deliver locally to any recipients that are registered users of EmailPro
        var allRecipients = toAddresses.Concat(ccAddresses).Concat(bccAddresses).Select(a => a.Address.ToLowerInvariant()).Distinct();
        foreach (var recipientEmail in allRecipients)
        {
            var localRecipient = await _context.Users.Find(u => u.Email == recipientEmail).FirstOrDefaultAsync();
            if (localRecipient != null && localRecipient.Id != userId)
            {
                var recipientInboxCopy = new EmailMessage
                {
                    UserId = localRecipient.Id,
                    Folder = "inbox",
                    From = senderFromAddress,
                    To = toAddresses,
                    Cc = ccAddresses,
                    Bcc = bccAddresses,
                    Subject = sentEmail.Subject,
                    Body = sentEmail.Body,
                    Snippet = snippet,
                    Attachments = attachments,
                    IsRead = false,
                    DeliveryStatus = "Received",
                    MessageId = messageRfcId,
                    InReplyTo = request.InReplyTo,
                    CreatedAt = DateTime.UtcNow
                };
                await _context.Emails.InsertOneAsync(recipientInboxCopy);
            }
        }

        if (smtpSuccess)
        {
            return new SendEmailResult
            {
                Success = true,
                EmailId = sentEmail.Id,
                DeliveryStatus = "Sent",
                Message = "Message dispatched and delivered via SMTP successfully."
            };
        }
        else
        {
            return new SendEmailResult
            {
                Success = false,
                EmailId = sentEmail.Id,
                DeliveryStatus = "Failed",
                Message = "Message saved in Sent folder, but external SMTP transmission failed.",
                Error = smtpErrorMessage
            };
        }
    }

    public async Task<SendEmailResult> ReplyEmailAsync(string userId, string emailId, SendEmailRequest request)
    {
        var original = await _context.Emails.Find(e => e.Id == emailId && e.UserId == userId).FirstOrDefaultAsync();
        if (original == null)
        {
            throw new KeyNotFoundException("Original email not found.");
        }

        if (string.IsNullOrWhiteSpace(request.Subject))
        {
            request.Subject = original.Subject.StartsWith("Re:", StringComparison.OrdinalIgnoreCase) 
                ? original.Subject 
                : $"Re: {original.Subject}";
        }

        request.InReplyTo = original.MessageId ?? original.Id;
        return await SendEmailAsync(userId, request);
    }

    public async Task<SendEmailResult> ForwardEmailAsync(string userId, string emailId, SendEmailRequest request)
    {
        var original = await _context.Emails.Find(e => e.Id == emailId && e.UserId == userId).FirstOrDefaultAsync();
        if (original == null)
        {
            throw new KeyNotFoundException("Original email not found.");
        }

        if (string.IsNullOrWhiteSpace(request.Subject))
        {
            request.Subject = original.Subject.StartsWith("Fwd:", StringComparison.OrdinalIgnoreCase) 
                ? original.Subject 
                : $"Fwd: {original.Subject}";
        }

        // Attach original attachments if none were passed
        if ((request.Attachments == null || request.Attachments.Count == 0) && original.Attachments != null && original.Attachments.Count > 0)
        {
            request.Attachments = original.Attachments.Select(a => new EmailAttachmentDto
            {
                FileName = a.FileName,
                ContentType = a.ContentType,
                SizeBytes = a.SizeBytes,
                Base64Data = a.Base64Data
            }).ToList();
        }

        return await SendEmailAsync(userId, request);
    }

    public async Task<bool> MarkAsReadAsync(string userId, string emailId, bool isRead)
    {
        var result = await _context.Emails.UpdateOneAsync(
            e => e.Id == emailId && e.UserId == userId,
            Builders<EmailMessage>.Update.Set(e => e.IsRead, isRead)
        );
        return result.ModifiedCount > 0;
    }

    public async Task<bool> ToggleStarAsync(string userId, string emailId)
    {
        var email = await _context.Emails.Find(e => e.Id == emailId && e.UserId == userId).FirstOrDefaultAsync();
        if (email == null) return false;

        var result = await _context.Emails.UpdateOneAsync(
            e => e.Id == emailId && e.UserId == userId,
            Builders<EmailMessage>.Update.Set(e => e.IsStarred, !email.IsStarred)
        );
        return result.ModifiedCount > 0;
    }

    public async Task<bool> DeleteEmailAsync(string userId, string emailId)
    {
        var email = await _context.Emails.Find(e => e.Id == emailId && e.UserId == userId).FirstOrDefaultAsync();
        if (email == null) return false;

        // Permanent deletion from user's mailbox
        var result = await _context.Emails.DeleteOneAsync(e => e.Id == emailId && e.UserId == userId);
        return result.DeletedCount > 0;
    }

    public async Task<EmailAttachment?> GetAttachmentAsync(string userId, string emailId, string attachmentId)
    {
        var email = await _context.Emails.Find(e => e.Id == emailId && e.UserId == userId).FirstOrDefaultAsync();
        if (email == null || email.Attachments == null) return null;

        return email.Attachments.FirstOrDefault(a => a.Id == attachmentId);
    }

    public async Task<int> ProcessInboundWebhookAsync(InboundWebhookDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.To)) return 0;

        // Parse recipient email from To header, e.g. "Name <user@domain.com>" or "user@domain.com"
        var recipientMatch = Regex.Match(dto.To, @"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+");
        if (!recipientMatch.Success) return 0;

        var recipientEmail = recipientMatch.Value.ToLowerInvariant();
        var targetUser = await _context.Users.Find(u => u.Email == recipientEmail).FirstOrDefaultAsync();
        if (targetUser == null)
        {
            _logger.LogWarning("Inbound email received for unknown recipient: {Recipient}", recipientEmail);
            return 0;
        }

        var senderAddress = new EmailAddress(dto.From);
        var senderMatch = Regex.Match(dto.From, @"(.*)<([a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)>");
        if (senderMatch.Success)
        {
            senderAddress = new EmailAddress(senderMatch.Groups[2].Value.Trim(), senderMatch.Groups[1].Value.Trim().Trim('"', '\''));
        }

        var body = !string.IsNullOrWhiteSpace(dto.Html) ? dto.Html : (dto.Text ?? string.Empty);
        var snippet = CreateSnippet(!string.IsNullOrWhiteSpace(dto.Text) ? dto.Text : body);

        var newEmail = new EmailMessage
        {
            UserId = targetUser.Id,
            Folder = "inbox",
            From = senderAddress,
            To = new List<EmailAddress> { new(recipientEmail, targetUser.FullName) },
            Subject = string.IsNullOrWhiteSpace(dto.Subject) ? "(no subject)" : dto.Subject,
            Body = body,
            Snippet = snippet,
            IsRead = false,
            DeliveryStatus = "Received",
            CreatedAt = DateTime.UtcNow
        };

        await _context.Emails.InsertOneAsync(newEmail);
        _logger.LogInformation("Inbound webhook email stored in inbox for user {Email}", recipientEmail);
        return 1;
    }

    public async Task<SyncImapResult> SyncImapEmailsAsync(string userId)
    {
        var user = await _context.Users.Find(u => u.Id == userId).FirstOrDefaultAsync();
        if (user == null)
        {
            return new SyncImapResult { Success = false, Message = "User not found." };
        }

        var (imapHost, imapPort, imapUseSsl, imapUser, imapPass, hasImapConfig) = ResolveImapConfig(user);
        if (!hasImapConfig)
        {
            return new SyncImapResult
            {
                Success = false,
                Message = "IMAP receiving is not configured. Please add your IMAP server and App Password in Settings or appsettings.json to fetch incoming emails."
            };
        }

        try
        {
            using var client = new ImapClient();
            client.ServerCertificateValidationCallback = (s, c, h, e) => true;

            var socketOptions = imapUseSsl ? SecureSocketOptions.SslOnConnect : SecureSocketOptions.Auto;
            await client.ConnectAsync(imapHost, imapPort, socketOptions);
            await client.AuthenticateAsync(imapUser, imapPass);

            var inbox = client.Inbox;
            await inbox.OpenAsync(MailKit.FolderAccess.ReadOnly);

            // Fetch up to the last 20 messages from inbox
            int total = inbox.Count;
            int fetchLimit = 20;
            int startIndex = Math.Max(0, total - fetchLimit);

            int importedCount = 0;
            for (int i = total - 1; i >= startIndex; i--)
            {
                var message = await inbox.GetMessageAsync(i);
                var messageId = message.MessageId;

                // Check if already imported
                var exists = await _context.Emails.Find(e => e.UserId == userId && e.MessageId == messageId).AnyAsync();
                if (exists) continue;

                var fromMailbox = message.From.Mailboxes.FirstOrDefault();
                var fromAddress = fromMailbox != null 
                    ? new EmailAddress(fromMailbox.Address, fromMailbox.Name ?? "") 
                    : new EmailAddress("unknown@unknown.com", "Unknown");

                var toAddresses = message.To.Mailboxes.Select(m => new EmailAddress(m.Address, m.Name ?? "")).ToList();
                var ccAddresses = message.Cc.Mailboxes.Select(m => new EmailAddress(m.Address, m.Name ?? "")).ToList();

                var body = !string.IsNullOrWhiteSpace(message.HtmlBody) ? message.HtmlBody : (message.TextBody ?? string.Empty);
                var snippet = CreateSnippet(!string.IsNullOrWhiteSpace(message.TextBody) ? message.TextBody : body);

                var attachments = new List<EmailAttachment>();
                foreach (var att in message.Attachments)
                {
                    if (att is MimePart part)
                    {
                        using var ms = new MemoryStream();
                        if (part.Content != null)
                        {
                            await part.Content.DecodeToAsync(ms);
                        }
                        attachments.Add(new EmailAttachment
                        {
                            Id = Guid.NewGuid().ToString("N"),
                            FileName = part.FileName ?? "attachment",
                            ContentType = part.ContentType?.MimeType ?? "application/octet-stream",
                            SizeBytes = ms.Length,
                            Base64Data = Convert.ToBase64String(ms.ToArray())
                        });
                    }
                }

                var newEmail = new EmailMessage
                {
                    UserId = userId,
                    Folder = "inbox",
                    From = fromAddress,
                    To = toAddresses,
                    Cc = ccAddresses,
                    Subject = message.Subject ?? "(no subject)",
                    Body = body,
                    Snippet = snippet,
                    Attachments = attachments,
                    IsRead = false,
                    DeliveryStatus = "Received",
                    MessageId = messageId,
                    InReplyTo = message.InReplyTo,
                    CreatedAt = message.Date.UtcDateTime > DateTime.MinValue ? message.Date.UtcDateTime : DateTime.UtcNow
                };

                await _context.Emails.InsertOneAsync(newEmail);
                importedCount++;
            }

            await client.DisconnectAsync(true);

            // Update user's last sync time
            if (user.ImapSettings != null)
            {
                user.ImapSettings.LastSyncAt = DateTime.UtcNow;
                await _context.Users.UpdateOneAsync(
                    u => u.Id == userId,
                    Builders<User>.Update.Set(u => u.ImapSettings, user.ImapSettings)
                );
            }

            return new SyncImapResult
            {
                Success = true,
                FetchedCount = importedCount,
                Message = importedCount > 0 
                    ? $"Successfully synced {importedCount} new email(s) from your external inbox."
                    : "Inbox is up to date. No new incoming messages found."
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "IMAP Sync failed for user {UserId}: {Message}", userId, ex.Message);
            return new SyncImapResult
            {
                Success = false,
                FetchedCount = 0,
                Message = $"IMAP connection failed: {ex.Message}. Verify your host, port, and App Password in Settings."
            };
        }
    }

    public async Task<Dictionary<string, int>> GetFolderCountsAsync(string userId)
    {
        var inboxUnread = (int)await _context.Emails.CountDocumentsAsync(
            e => e.UserId == userId && e.Folder == "inbox" && !e.IsRead
        );
        var sentTotal = (int)await _context.Emails.CountDocumentsAsync(
            e => e.UserId == userId && e.Folder == "sent"
        );

        return new Dictionary<string, int>
        {
            { "inboxUnread", inboxUnread },
            { "sentTotal", sentTotal }
        };
    }

    private (string host, int port, bool useSsl, string user, string pass, bool hasConfig) ResolveSmtpConfig(User user)
    {
        if (user.SmtpSettings != null && !string.IsNullOrWhiteSpace(user.SmtpSettings.Host))
        {
            return (
                user.SmtpSettings.Host,
                user.SmtpSettings.Port,
                user.SmtpSettings.UseSsl,
                user.SmtpSettings.Username,
                user.SmtpSettings.Password,
                !string.IsNullOrWhiteSpace(user.SmtpSettings.Host) && !string.IsNullOrWhiteSpace(user.SmtpSettings.Password)
            );
        }

        var systemHost = _configuration["EmailSettings:SmtpHost"] ?? "";
        var systemPort = int.TryParse(_configuration["EmailSettings:SmtpPort"], out var p) ? p : 587;
        var systemSsl = bool.TryParse(_configuration["EmailSettings:EnableSsl"], out var s) ? s : true;
        var systemUser = _configuration["EmailSettings:SenderEmail"] ?? "";
        var systemPass = _configuration["EmailSettings:SenderPassword"] ?? "";

        var hasConfig = !string.IsNullOrWhiteSpace(systemHost) && !string.IsNullOrWhiteSpace(systemPass);
        return (systemHost, systemPort, systemSsl, systemUser, systemPass, hasConfig);
    }

    private (string host, int port, bool useSsl, string user, string pass, bool hasConfig) ResolveImapConfig(User user)
    {
        var imapHost = user.ImapSettings?.Host;
        var imapPass = user.ImapSettings?.Password;
        var imapUser = user.ImapSettings?.Username;
        var imapPort = user.ImapSettings?.Port ?? 993;
        var imapSsl = user.ImapSettings?.UseSsl ?? true;

        // If IMAP password was left blank, automatically reuse SMTP password (common for Gmail/Outlook)
        if (string.IsNullOrWhiteSpace(imapPass) && user.SmtpSettings != null)
        {
            imapPass = user.SmtpSettings.Password;
        }

        if (string.IsNullOrWhiteSpace(imapUser))
        {
            imapUser = user.SmtpSettings?.Username ?? user.Email;
        }

        if (string.IsNullOrWhiteSpace(imapHost))
        {
            imapHost = "imap.gmail.com";
        }

        if (!string.IsNullOrWhiteSpace(imapHost) && !string.IsNullOrWhiteSpace(imapPass))
        {
            return (imapHost, imapPort, imapSsl, imapUser, imapPass, true);
        }

        var systemHost = _configuration["EmailSettings:ImapHost"] ?? "";
        var systemPort = int.TryParse(_configuration["EmailSettings:ImapPort"], out var p) ? p : 993;
        var systemSsl = bool.TryParse(_configuration["EmailSettings:ImapEnableSsl"], out var s) ? s : true;
        var systemUser = _configuration["EmailSettings:SenderEmail"] ?? "";
        var systemPass = _configuration["EmailSettings:SenderPassword"] ?? "";

        var hasConfig = !string.IsNullOrWhiteSpace(systemHost) && !string.IsNullOrWhiteSpace(systemPass);
        return (systemHost, systemPort, systemSsl, systemUser, systemPass, hasConfig);
    }

    private static string CreateSnippet(string? body)
    {
        if (string.IsNullOrWhiteSpace(body)) return string.Empty;
        var text = StripHtml(body);
        text = Regex.Replace(text, @"\s+", " ").Trim();
        return text.Length > 140 ? text.Substring(0, 137) + "..." : text;
    }

    private static string StripHtml(string html)
    {
        if (string.IsNullOrWhiteSpace(html)) return string.Empty;
        var noTags = Regex.Replace(html, "<.*?>", string.Empty);
        return System.Net.WebUtility.HtmlDecode(noTags);
    }

    private static bool IsHtml(string? content)
    {
        if (string.IsNullOrWhiteSpace(content)) return false;
        return content.Contains("<html", StringComparison.OrdinalIgnoreCase) ||
               content.Contains("<body", StringComparison.OrdinalIgnoreCase) ||
               content.Contains("<p>", StringComparison.OrdinalIgnoreCase) ||
               content.Contains("<div>", StringComparison.OrdinalIgnoreCase) ||
               content.Contains("<br", StringComparison.OrdinalIgnoreCase);
    }

    private static string GetDomain(string email)
    {
        var atIndex = email.IndexOf('@');
        return atIndex > 0 ? email.Substring(atIndex + 1) : "emailpro.local";
    }
}
