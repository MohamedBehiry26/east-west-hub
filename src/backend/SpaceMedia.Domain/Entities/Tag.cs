namespace SpaceMedia.Domain.Entities;

public sealed class Tag
{
    public Guid Id { get; set; }
    public required string NameEn { get; set; }
    public required string NameAr { get; set; }
    public required string SlugEn { get; set; }
    public required string SlugAr { get; set; }
    public ICollection<VideoTag> VideoTags { get; set; } = [];
}
