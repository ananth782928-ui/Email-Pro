using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Backend.Data;
using Backend.DTOs;
using Backend.Models;
using Microsoft.IdentityModel.Tokens;
using MongoDB.Driver;

namespace Backend.Services;

public class AuthService : IAuthService
{
    private readonly MongoDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly ILogger<AuthService> _logger;

    public AuthService(MongoDbContext context, IConfiguration configuration, ILogger<AuthService> logger)
    {
        _context = context;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<AuthResponse> RegisterAsync(RegisterRequest request)
    {
        var normalizedEmail = request.Email.Trim().ToLowerInvariant();

        var existingUser = await _context.Users
            .Find(u => u.Email == normalizedEmail)
            .FirstOrDefaultAsync();

        if (existingUser != null)
        {
            throw new InvalidOperationException("An account with this email address already exists.");
        }

        var passwordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);

        var newUser = new User
        {
            Email = normalizedEmail,
            FullName = request.FullName.Trim(),
            PasswordHash = passwordHash,
            CreatedAt = DateTime.UtcNow
        };

        await _context.Users.InsertOneAsync(newUser);

        // Seed an introductory welcome email in their inbox
        var welcomeEmail = new EmailMessage
        {
            UserId = newUser.Id,
            Folder = "inbox",
            From = new EmailAddress("support@emailpro.local", "EmailPro Team"),
            To = new List<EmailAddress> { new(newUser.Email, newUser.FullName) },
            Subject = "Welcome to EmailPro — Modern & Secure Mail",
            Body = $@"<div style=""font-family: 'Plus Jakarta Sans', sans-serif; color: #1e293b; line-height: 1.6;"">
                <h2 style=""color: #2563eb;"">Welcome to your new EmailPro inbox, {newUser.FullName}!</h2>
                <p>We are delighted to have you on board. EmailPro provides a clean, fast, and modern email experience with full support for real email sending and receiving.</p>
                <div style=""background: #f8fafc; border-left: 4px solid #2563eb; padding: 12px 16px; margin: 16px 0; border-radius: 4px;"">
                    <strong>Quick Start Guide:</strong>
                    <ul>
                        <li><strong>Compose:</strong> Send emails to real external addresses or local users.</li>
                        <li><strong>Real SMTP:</strong> Configure your SMTP settings (e.g. Gmail App Password) under your profile menu for live external delivery.</li>
                        <li><strong>Inbound Sync:</strong> Connect your IMAP inbox or configure inbound webhooks to receive real-time messages.</li>
                        <li><strong>Attachments:</strong> Send and receive files seamlessly.</li>
                    </ul>
                </div>
                <p>Happy emailing!<br/><strong>The EmailPro Team</strong></p>
            </div>",
            Snippet = "Welcome to your new EmailPro inbox! We are delighted to have you on board...",
            IsRead = false,
            DeliveryStatus = "Received",
            CreatedAt = DateTime.UtcNow
        };

        await _context.Emails.InsertOneAsync(welcomeEmail);

        var token = GenerateJwtToken(newUser);

        return new AuthResponse
        {
            Token = token,
            User = MapToDto(newUser)
        };
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request)
    {
        var normalizedEmail = request.Email.Trim().ToLowerInvariant();

        var user = await _context.Users
            .Find(u => u.Email == normalizedEmail)
            .FirstOrDefaultAsync();

        if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            throw new UnauthorizedAccessException("Invalid email or password.");
        }

        var token = GenerateJwtToken(user);

        return new AuthResponse
        {
            Token = token,
            User = MapToDto(user)
        };
    }

    public async Task<UserProfileDto> GetUserProfileAsync(string userId)
    {
        var user = await _context.Users.Find(u => u.Id == userId).FirstOrDefaultAsync();
        if (user == null)
        {
            throw new KeyNotFoundException("User not found.");
        }

        return MapToDto(user);
    }

    public async Task<UserProfileDto> UpdateSettingsAsync(string userId, UpdateSettingsRequest request)
    {
        var user = await _context.Users.Find(u => u.Id == userId).FirstOrDefaultAsync();
        if (user == null)
        {
            throw new KeyNotFoundException("User not found.");
        }

        if (request.Smtp != null)
        {
            user.SmtpSettings = new UserSmtpSettings
            {
                Host = request.Smtp.Host?.Trim() ?? string.Empty,
                Port = request.Smtp.Port > 0 ? request.Smtp.Port : 587,
                UseSsl = request.Smtp.UseSsl,
                Username = request.Smtp.Username?.Trim() ?? string.Empty,
                Password = !string.IsNullOrWhiteSpace(request.Smtp.Password) 
                    ? request.Smtp.Password.Trim() 
                    : (user.SmtpSettings?.Password ?? string.Empty),
                FromEmail = request.Smtp.FromEmail?.Trim() ?? user.Email,
                FromName = request.Smtp.FromName?.Trim() ?? user.FullName
            };
        }

        if (request.Imap != null)
        {
            var imapPassword = !string.IsNullOrWhiteSpace(request.Imap.Password)
                ? request.Imap.Password.Trim()
                : (!string.IsNullOrWhiteSpace(user.ImapSettings?.Password) 
                    ? user.ImapSettings.Password 
                    : (user.SmtpSettings?.Password ?? request.Smtp?.Password ?? string.Empty));

            user.ImapSettings = new UserImapSettings
            {
                Host = string.IsNullOrWhiteSpace(request.Imap.Host) ? "imap.gmail.com" : request.Imap.Host.Trim(),
                Port = request.Imap.Port > 0 ? request.Imap.Port : 993,
                UseSsl = request.Imap.UseSsl,
                Username = string.IsNullOrWhiteSpace(request.Imap.Username) 
                    ? (user.SmtpSettings?.Username ?? request.Smtp?.Username ?? user.Email) 
                    : request.Imap.Username.Trim(),
                Password = imapPassword,
                LastSyncAt = user.ImapSettings?.LastSyncAt,
                LastUid = user.ImapSettings?.LastUid
            };
        }

        user.UpdatedAt = DateTime.UtcNow;

        await _context.Users.ReplaceOneAsync(u => u.Id == userId, user);

        return MapToDto(user);
    }

    public async Task<User?> GetUserByIdAsync(string userId)
    {
        return await _context.Users.Find(u => u.Id == userId).FirstOrDefaultAsync();
    }

    private string GenerateJwtToken(User user)
    {
        var secret = _configuration["Jwt:Secret"] ?? "Default_Secret_Key_At_Least_32_Bytes_Long_2026!";
        var issuer = _configuration["Jwt:Issuer"] ?? "EmailProBackend";
        var audience = _configuration["Jwt:Audience"] ?? "EmailProFrontend";
        var expiryMinutes = int.TryParse(_configuration["Jwt:ExpiryMinutes"], out var mins) ? mins : 1440;

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Name, user.FullName)
        };

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(expiryMinutes),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private static UserProfileDto MapToDto(User user)
    {
        return new UserProfileDto
        {
            Id = user.Id,
            Email = user.Email,
            FullName = user.FullName,
            HasCustomSmtp = user.SmtpSettings != null && !string.IsNullOrWhiteSpace(user.SmtpSettings.Host),
            HasCustomImap = user.ImapSettings != null && !string.IsNullOrWhiteSpace(user.ImapSettings.Host),
            SmtpSettings = user.SmtpSettings == null ? null : new UserSmtpSettingsDto
            {
                Host = user.SmtpSettings.Host,
                Port = user.SmtpSettings.Port,
                UseSsl = user.SmtpSettings.UseSsl,
                Username = user.SmtpSettings.Username,
                FromEmail = user.SmtpSettings.FromEmail,
                FromName = user.SmtpSettings.FromName,
                Password = string.IsNullOrEmpty(user.SmtpSettings.Password) ? "" : "******"
            },
            ImapSettings = user.ImapSettings == null ? null : new UserImapSettingsDto
            {
                Host = user.ImapSettings.Host,
                Port = user.ImapSettings.Port,
                UseSsl = user.ImapSettings.UseSsl,
                Username = user.ImapSettings.Username,
                Password = string.IsNullOrEmpty(user.ImapSettings.Password) ? "" : "******",
                LastSyncAt = user.ImapSettings.LastSyncAt
            }
        };
    }
}
