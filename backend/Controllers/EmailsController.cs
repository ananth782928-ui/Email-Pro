using System.Security.Claims;
using Backend.DTOs;
using Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class EmailsController : ControllerBase
{
    private readonly IEmailService _emailService;
    private readonly ILogger<EmailsController> _logger;

    public EmailsController(IEmailService emailService, ILogger<EmailsController> logger)
    {
        _emailService = emailService;
        _logger = logger;
    }

    [HttpGet]
    [Authorize]
    public async Task<IActionResult> GetEmails(
        [FromQuery] string folder = "inbox",
        [FromQuery] string? search = null,
        [FromQuery] bool? unreadOnly = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 25)
    {
        var userId = GetCurrentUserId();
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        var result = await _emailService.GetEmailsAsync(userId, folder, search, unreadOnly, page, pageSize);
        return Ok(result);
    }

    [HttpGet("counts")]
    [Authorize]
    public async Task<IActionResult> GetCounts()
    {
        var userId = GetCurrentUserId();
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        var counts = await _emailService.GetFolderCountsAsync(userId);
        return Ok(counts);
    }

    [HttpGet("{id}")]
    [Authorize]
    public async Task<IActionResult> GetEmailById(string id)
    {
        var userId = GetCurrentUserId();
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        try
        {
            var email = await _emailService.GetEmailByIdAsync(userId, id);
            return Ok(email);
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { message = "Email message not found." });
        }
    }

    [HttpPost("send")]
    [Authorize]
    public async Task<IActionResult> SendEmail([FromBody] SendEmailRequest request)
    {
        var userId = GetCurrentUserId();
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        try
        {
            var result = await _emailService.SendEmailAsync(userId, request);
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send email");
            return StatusCode(500, new { message = "An error occurred while sending email: " + ex.Message });
        }
    }

    [HttpPost("{id}/reply")]
    [Authorize]
    public async Task<IActionResult> ReplyEmail(string id, [FromBody] SendEmailRequest request)
    {
        var userId = GetCurrentUserId();
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        try
        {
            var result = await _emailService.ReplyEmailAsync(userId, id, request);
            return Ok(result);
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { message = "Original email not found." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to reply to email {Id}", id);
            return StatusCode(500, new { message = ex.Message });
        }
    }

    [HttpPost("{id}/forward")]
    [Authorize]
    public async Task<IActionResult> ForwardEmail(string id, [FromBody] SendEmailRequest request)
    {
        var userId = GetCurrentUserId();
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        try
        {
            var result = await _emailService.ForwardEmailAsync(userId, id, request);
            return Ok(result);
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { message = "Original email not found." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to forward email {Id}", id);
            return StatusCode(500, new { message = ex.Message });
        }
    }

    [HttpPatch("{id}/read")]
    [Authorize]
    public async Task<IActionResult> MarkRead(string id, [FromBody] MarkReadRequest request)
    {
        var userId = GetCurrentUserId();
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        var success = await _emailService.MarkAsReadAsync(userId, id, request.IsRead);
        if (!success)
        {
            return NotFound(new { message = "Email not found." });
        }

        return Ok(new { success = true, isRead = request.IsRead });
    }

    [HttpPost("{id}/star")]
    [Authorize]
    public async Task<IActionResult> ToggleStar(string id)
    {
        var userId = GetCurrentUserId();
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        var success = await _emailService.ToggleStarAsync(userId, id);
        if (!success)
        {
            return NotFound(new { message = "Email not found." });
        }

        return Ok(new { success = true });
    }

    [HttpDelete("{id}")]
    [Authorize]
    public async Task<IActionResult> DeleteEmail(string id)
    {
        var userId = GetCurrentUserId();
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        var success = await _emailService.DeleteEmailAsync(userId, id);
        if (!success)
        {
            return NotFound(new { message = "Email not found or already deleted." });
        }

        return Ok(new { success = true, message = "Email deleted successfully." });
    }

    [HttpGet("{id}/attachments/{attachmentId}")]
    [Authorize]
    public async Task<IActionResult> DownloadAttachment(string id, string attachmentId)
    {
        var userId = GetCurrentUserId();
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        var attachment = await _emailService.GetAttachmentAsync(userId, id, attachmentId);
        if (attachment == null)
        {
            return NotFound(new { message = "Attachment not found." });
        }

        if (string.IsNullOrWhiteSpace(attachment.Base64Data))
        {
            return NotFound(new { message = "Attachment content is empty." });
        }

        var bytes = Convert.FromBase64String(attachment.Base64Data);
        return File(bytes, attachment.ContentType, attachment.FileName);
    }

    [HttpPost("sync-imap")]
    [Authorize]
    public async Task<IActionResult> SyncImap()
    {
        var userId = GetCurrentUserId();
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        var result = await _emailService.SyncImapEmailsAsync(userId);
        return Ok(result);
    }

    [HttpPost("inbound")]
    [AllowAnonymous]
    public async Task<IActionResult> InboundWebhook([FromBody] InboundWebhookDto dto)
    {
        try
        {
            var processed = await _emailService.ProcessInboundWebhookAsync(dto);
            return Ok(new { success = true, processedCount = processed });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing inbound webhook");
            return StatusCode(500, new { message = ex.Message });
        }
    }

    private string? GetCurrentUserId()
    {
        return User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
    }
}
