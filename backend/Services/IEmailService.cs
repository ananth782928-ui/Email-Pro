using Backend.DTOs;
using Backend.Models;

namespace Backend.Services;

public interface IEmailService
{
    Task<EmailListResponse> GetEmailsAsync(string userId, string folder, string? search, bool? unreadOnly, int page, int pageSize);
    Task<EmailDetailDto> GetEmailByIdAsync(string userId, string emailId);
    Task<SendEmailResult> SendEmailAsync(string userId, SendEmailRequest request);
    Task<SendEmailResult> ReplyEmailAsync(string userId, string emailId, SendEmailRequest request);
    Task<SendEmailResult> ForwardEmailAsync(string userId, string emailId, SendEmailRequest request);
    Task<bool> MarkAsReadAsync(string userId, string emailId, bool isRead);
    Task<bool> ToggleStarAsync(string userId, string emailId);
    Task<bool> DeleteEmailAsync(string userId, string emailId);
    Task<EmailAttachment?> GetAttachmentAsync(string userId, string emailId, string attachmentId);
    Task<int> ProcessInboundWebhookAsync(InboundWebhookDto dto);
    Task<SyncImapResult> SyncImapEmailsAsync(string userId);
    Task<Dictionary<string, int>> GetFolderCountsAsync(string userId);
}
