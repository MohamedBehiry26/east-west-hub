namespace EastWestHub.Api;

public static class DevelopmentStartupSafety
{
    public static void Validate(bool enabled, string environment)
    {
        if (enabled && !string.Equals(environment, "Development", StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("Development:SkipDatabaseInitialization is permitted only in Development.");
    }
}
