namespace EastWestHub.Application.Authentication;

public interface IAdminAuthService
{
    Task<AdminLoginResult?> LoginAsync(string email, string password);
}
