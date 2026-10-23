using Backend.DTOs;
using Backend.Models;

namespace Backend.Services;

public interface IAuthService
{
    Task<AuthResponse> RegisterAsync(RegisterRequest request);
    Task<AuthResponse> LoginAsync(LoginRequest request);
    Task<UserProfileDto> GetUserProfileAsync(string userId);
    Task<UserProfileDto> UpdateSettingsAsync(string userId, UpdateSettingsRequest request);
    Task<User?> GetUserByIdAsync(string userId);
}
