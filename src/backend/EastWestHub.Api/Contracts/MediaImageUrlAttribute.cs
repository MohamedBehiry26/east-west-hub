using System.ComponentModel.DataAnnotations;
namespace EastWestHub.Api.Contracts;

/// <summary>Keep existing UrlAttribute protocols, but reject URLs without a valid host.</summary>
[AttributeUsage(AttributeTargets.Property | AttributeTargets.Parameter)]
public sealed class MediaImageUrlAttribute : ValidationAttribute
{
    public MediaImageUrlAttribute() : base("Enter a valid absolute HTTP, HTTPS or FTP image URL.") { }
    public override bool IsValid(object? value) => value is null ||
        value is string text && new UrlAttribute().IsValid(text) &&
        Uri.TryCreate(text, UriKind.Absolute, out var uri) && !string.IsNullOrEmpty(uri.Host);
}
