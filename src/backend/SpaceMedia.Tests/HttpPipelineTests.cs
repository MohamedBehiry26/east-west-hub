using System.Net;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace SpaceMedia.Tests;

public sealed class HttpPipelineTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public HttpPipelineTests(WebApplicationFactory<Program> factory)
    {
        _client = factory.WithWebHostBuilder(builder => builder.UseSetting("environment", "Development")).CreateClient();
    }

    [Fact]
    public async Task Health_is_anonymous_and_security_headers_are_emitted()
    {
        var response = await _client.GetAsync("/health");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("nosniff", response.Headers.GetValues("X-Content-Type-Options").Single());
        Assert.Equal("DENY", response.Headers.GetValues("X-Frame-Options").Single());
        Assert.True(response.Headers.Contains("Content-Security-Policy"));
        Assert.True(response.Headers.Contains("Referrer-Policy"));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("Bearer malformed.token.value")]
    public async Task Admin_endpoint_rejects_missing_or_invalid_bearer_tokens(string? authorization)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, "/api/admin/videos");
        if (authorization is not null) request.Headers.TryAddWithoutValidation("Authorization", authorization);

        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Equal("nosniff", response.Headers.GetValues("X-Content-Type-Options").Single());
    }
}
