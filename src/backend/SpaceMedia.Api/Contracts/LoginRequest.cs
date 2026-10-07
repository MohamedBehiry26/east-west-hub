using System.ComponentModel.DataAnnotations;

namespace SpaceMedia.Api.Contracts;

public sealed class LoginRequest
{
    [Required, EmailAddress, StringLength(320)]
    public required string Email { get; init; }

    [Required, StringLength(128)]
    public required string Password { get; init; }
}
