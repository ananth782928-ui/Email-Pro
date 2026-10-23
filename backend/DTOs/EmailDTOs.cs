using System.ComponentModel.DataAnnotations;
using Backend.Models;

namespace Backend.DTOs;

public class SendEmailRequest
{
    [Required]
    public List<string> To { get; set; } = new();

    public List<string>? Cc { get; set; }
    public List<string>? Bcc { get; set; }

    [Required]
    public string Subject { get; set; } = string.Empty;

    public string Body { get; set; } = string.Empty;

    public string? InReplyTo { get; set; }

    public List<EmailAttachmentDto>? Attachments { get; set; }
}

public class EmailAttachmentDto
{
    public string FileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = "application/octet-stream";
    public long SizeBytes { get; set; }
    public string Base64Data { get; set; } = string.Empty;
}

public class EmailSummaryDto
{
    public string Id { get; set; } = string.Empty;
    public EmailAddress From { get; set; } = new();
    public List<EmailAddress> To { get; set; } = new();
    public string Subject { get; set; } = string.Empty;
    public string Snippet { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? SentAt { get; set; }
    public bool IsRead { get; set; }
    public bool IsStarred { get; set; }
    public string Folder { get; set; } = "inbox";
    public string DeliveryStatus { get; set; } = "Sent";
    public string? DeliveryError { get; set; }
    public bool HasAttachments { get; set; }
}

public class EmailDetailDto : EmailSummaryDto
{
    public List<EmailAddress> Cc { get; set; } = new();
    public List<EmailAddress> Bcc { get; set; } = new();
    public string Body { get; set; } = string.Empty;
    public List<EmailAttachment> Attachments { get; set; } = new();
    public string? MessageId { get; set; }
    public string? InReplyTo { get; set; }
}

public class EmailListResponse
{
    public List<EmailSummaryDto> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int UnreadCount { get; set; }
}

public class SendEmailResult
{
    public bool Success { get; set; }
    public string EmailId { get; set; } = string.Empty;
    public string DeliveryStatus { get; set; } = "Sent";
    public string Message { get; set; } = string.Empty;
    public string? Error { get; set; }
}

public class MarkReadRequest
{
    public bool IsRead { get; set; } = true;
}

public class SyncImapResult
{
    public bool Success { get; set; }
    public int FetchedCount { get; set; }
    public string Message { get; set; } = string.Empty;
}

public class InboundWebhookDto
{
    public string From { get; set; } = string.Empty;
    public string To { get; set; } = string.Empty;
    public string? Cc { get; set; }
    public string Subject { get; set; } = string.Empty;
    public string? Text { get; set; }
    public string? Html { get; set; }
}
