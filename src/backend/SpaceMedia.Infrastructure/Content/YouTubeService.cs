using System.Globalization;
using System.Xml;
using Microsoft.Extensions.Configuration;
using SpaceMedia.Application.Content;

namespace SpaceMedia.Infrastructure.Content;

public sealed class YouTubeService(HttpClient http, IConfiguration configuration) : IYouTubeService
{
    private const string ApiRoot = "https://www.googleapis.com/youtube/v3/";

    public async Task<IReadOnlyList<YouTubeVideoMetadata>> GetUploadsAsync(CancellationToken cancellationToken, string? channelId = null)
    {
        var apiKey = configuration["YouTube:ApiKey"];
        channelId = string.IsNullOrWhiteSpace(channelId) ? configuration["YouTube:ChannelId"] : channelId;
        if (string.IsNullOrWhiteSpace(apiKey) || string.IsNullOrWhiteSpace(channelId))
            throw new YouTubeNotConfiguredException();

        using var channel = await GetAsync($"channels?part=contentDetails&id={Escape(channelId)}", apiKey, cancellationToken);
        var channelItems = channel.RootElement.GetProperty("items").EnumerateArray().ToArray();
        if (channelItems.Length == 0) return [];
        var uploadsId = channelItems[0].GetProperty("contentDetails").GetProperty("relatedPlaylists").GetProperty("uploads").GetString();
        if (string.IsNullOrWhiteSpace(uploadsId)) return [];

        var ids = new List<string>();
        string? pageToken = null;
        do
        {
            var pageQuery = $"playlistItems?part=contentDetails&playlistId={Escape(uploadsId)}&maxResults=50";
            if (pageToken is not null) pageQuery += $"&pageToken={Escape(pageToken)}";
            using var playlist = await GetAsync(pageQuery, apiKey, cancellationToken);
            ids.AddRange(playlist.RootElement.GetProperty("items").EnumerateArray()
                .Select(item => item.GetProperty("contentDetails").GetProperty("videoId").GetString())
                .OfType<string>().Where(id => !string.IsNullOrWhiteSpace(id)));
            pageToken = playlist.RootElement.TryGetProperty("nextPageToken", out var next) ? next.GetString() : null;
        } while (pageToken is not null && ids.Count < 500);

        var result = new List<YouTubeVideoMetadata>();
        foreach (var batch in ids.Distinct(StringComparer.Ordinal).Take(500).Chunk(50))
        {
            var idList = string.Join(',', batch.Select(Escape));
            using var videos = await GetAsync($"videos?part=snippet,contentDetails,status&id={idList}", apiKey, cancellationToken);
            foreach (var item in videos.RootElement.GetProperty("items").EnumerateArray())
            {
                var snippet = item.GetProperty("snippet");
                var details = item.GetProperty("contentDetails");
                if (!item.TryGetProperty("status", out var status) || !status.TryGetProperty("privacyStatus", out var privacy) || privacy.GetString() != "public") continue;
                var thumbnails = snippet.GetProperty("thumbnails");
                var thumb = new[] { "maxres", "standard", "high", "medium", "default" }
                    .Select(key => thumbnails.TryGetProperty(key, out var value) ? value.GetProperty("url").GetString() : null)
                    .FirstOrDefault(value => !string.IsNullOrWhiteSpace(value));
                var id = item.GetProperty("id").GetString();
                var title = snippet.GetProperty("title").GetString();
                if (string.IsNullOrWhiteSpace(id) || string.IsNullOrWhiteSpace(title)) continue;
                var published = snippet.TryGetProperty("publishedAt", out var publishedElement)
                    && DateTimeOffset.TryParse(publishedElement.GetString(), CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out var parsed)
                    ? parsed : (DateTimeOffset?)null;
                var duration = details.TryGetProperty("duration", out var durationElement)
                    ? XmlConvert.ToTimeSpan(durationElement.GetString() ?? "PT0S") : (TimeSpan?)null;
                var tags = snippet.TryGetProperty("tags", out var tagArray)
                    ? tagArray.EnumerateArray().Select(tag => tag.GetString()).OfType<string>().Where(tag => !string.IsNullOrWhiteSpace(tag)).Distinct(StringComparer.OrdinalIgnoreCase).Take(20).ToArray()
                    : [];
                result.Add(new YouTubeVideoMetadata(id, title, snippet.TryGetProperty("description", out var description) ? description.GetString() ?? "" : "", thumb, published, duration, tags));
            }
        }
        return result;
    }

    private async Task<System.Text.Json.JsonDocument> GetAsync(string resource, string apiKey, CancellationToken cancellationToken)
    {
        using var response = await http.GetAsync($"{ApiRoot}{resource}&key={Escape(apiKey)}", cancellationToken);
        if (!response.IsSuccessStatusCode)
            throw new HttpRequestException($"YouTube Data API request failed with status {(int)response.StatusCode}.", null, response.StatusCode);
        await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
        return await System.Text.Json.JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);
    }

    private static string Escape(string value) => Uri.EscapeDataString(value);
}
