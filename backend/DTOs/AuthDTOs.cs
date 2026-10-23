using System.ComponentModel.DataAnnotations;
using Backend.Models;

namespace Backend.DTOs;

public class RegisterRequest
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    [MinLength(6)]
    public string Password { get; set; } = string.Empty;

    [Required]
    public string FullName { get; set; } = string.Empty;
}

public class LoginRequest
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    public string Password { get; set; } = string.Empty;
}

public class AuthResponse
{
    public string Token { get; set; } = string.Empty;
    public UserProfileDto User { get; set; } = new();
}

public class UserProfileDto
{
    public string Id { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public bool HasCustomSmtp { get; set; }
    public bool HasCustomImap { get; set; }
    public UserSmtpSettingsDto? SmtpSettings { get; set; }
    public UserImapSettingsDto? ImapSettings { get; set; }
}

public class UserSmtpSettingsDto
{
    public string Host { get; set; } = string.Empty;
    public int Port { get; set; } = 587;
    public bool UseSsl { get; set; } = true;
    public string Username { get; set; } = string.Empty;
    public string FromEmail { get; set; } = string.Empty;
    public string FromName { get; set; } = string.Empty;
    public string? Password { get; set; }
}

public class UserImapSettingsDto
{
    public string Host { get; set; } = string.Empty;
    public int Port { get; set; } = 993;
    public bool UseSsl { get; set; } = true;
    public string Username { get; set; } = string.Empty;
    public string? Password { get; set; }
    public DateTime? LastSyncAt { get; set; }
}

public class UpdateSettingsRequest
{
    public UserSmtpSettingsDto? Smtp { get; set; }
    public UserImapSettingsDto? Imap { get; set; }
}
