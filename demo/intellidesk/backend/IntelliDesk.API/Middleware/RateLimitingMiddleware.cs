using System.Collections.Concurrent;
using System.Net;

namespace IntelliDesk.API.Middleware;

/// <summary>
/// Sliding window rate limiter that throttles requests per API key or IP address.
/// </summary>
public class RateLimitingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<RateLimitingMiddleware> _logger;
    private readonly IConfiguration _configuration;
    private readonly ConcurrentDictionary<string, SlidingWindowCounter> _counters = new();

    public RateLimitingMiddleware(
        RequestDelegate next,
        ILogger<RateLimitingMiddleware> logger,
        IConfiguration configuration)
    {
        _next = next;
        _logger = logger;
        _configuration = configuration;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var clientKey = GetClientIdentifier(context);
        var windowSize = TimeSpan.FromSeconds(
            _configuration.GetValue<int>("RateLimiting:WindowSizeSeconds", 60));
        var maxRequests = _configuration.GetValue<int>("RateLimiting:MaxRequestsPerWindow", 100);

        var counter = _counters.GetOrAdd(clientKey, _ => new SlidingWindowCounter(windowSize));
        counter.PruneExpiredEntries();

        if (counter.Count >= maxRequests)
        {
            _logger.LogWarning("Rate limit exceeded for client {ClientKey}. Count: {Count}", clientKey, counter.Count);

            context.Response.StatusCode = (int)HttpStatusCode.TooManyRequests;
            context.Response.Headers["Retry-After"] = windowSize.TotalSeconds.ToString();
            await context.Response.WriteAsJsonAsync(new
            {
                error = "Rate limit exceeded",
                retryAfterSeconds = windowSize.TotalSeconds
            });
            return;
        }

        counter.Increment();
        context.Response.Headers["X-RateLimit-Limit"] = maxRequests.ToString();
        context.Response.Headers["X-RateLimit-Remaining"] = (maxRequests - counter.Count).ToString();

        await _next(context);
    }

    private static string GetClientIdentifier(HttpContext context)
    {
        // Prefer API key from header, fall back to IP address
        var apiKey = context.Request.Headers["X-Api-Key"].FirstOrDefault();
        if (!string.IsNullOrEmpty(apiKey))
            return $"apikey:{apiKey}";

        var forwardedFor = context.Request.Headers["X-Forwarded-For"].FirstOrDefault();
        var ip = forwardedFor ?? context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        return $"ip:{ip}";
    }

    private class SlidingWindowCounter
    {
        private readonly TimeSpan _windowSize;
        private readonly ConcurrentQueue<DateTime> _timestamps = new();

        public SlidingWindowCounter(TimeSpan windowSize)
        {
            _windowSize = windowSize;
        }

        public int Count => _timestamps.Count;

        public void Increment()
        {
            _timestamps.Enqueue(DateTime.UtcNow);
        }

        public void PruneExpiredEntries()
        {
            var cutoff = DateTime.UtcNow - _windowSize;
            while (_timestamps.TryPeek(out var timestamp) && timestamp < cutoff)
            {
                _timestamps.TryDequeue(out _);
            }
        }
    }
}
