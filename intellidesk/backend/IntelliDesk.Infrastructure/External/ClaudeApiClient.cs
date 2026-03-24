using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace IntelliDesk.Infrastructure.External;

/// <summary>
/// HTTP client wrapper for communicating with the Anthropic Claude API.
/// Provides a unified interface for all AI services in the application.
/// </summary>
public class ClaudeApiClient
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<ClaudeApiClient> _logger;
    private readonly string _apiKey;
    private readonly string _baseUrl;

    public ClaudeApiClient(IConfiguration configuration, ILogger<ClaudeApiClient> logger)
    {
        _httpClient = new HttpClient();
        _logger = logger;
        _apiKey = configuration["Claude:ApiKey"]
            ?? throw new InvalidOperationException("Claude API key is not configured.");
        _baseUrl = configuration["Claude:BaseUrl"] ?? "https://api.anthropic.com/v1";

        _httpClient.DefaultRequestHeaders.Add("x-api-key", _apiKey);
        _httpClient.DefaultRequestHeaders.Add("anthropic-version", "2024-01-01");
        _httpClient.DefaultRequestHeaders.Accept.Add(
            new MediaTypeWithQualityHeaderValue("application/json"));
    }

    /// <summary>
    /// Sends a message to the Claude API and returns the response.
    /// </summary>
    public async Task<ClaudeResponse> SendMessageAsync(
        string model,
        string prompt,
        double temperature = 0.7)
    {
        var requestBody = new ClaudeRequest
        {
            Model = model,
            Messages = new[]
            {
                new ClaudeMessage { Role = "user", Content = prompt }
            },
            Temperature = temperature
        };

        var json = JsonSerializer.Serialize(requestBody, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
        });

        _logger.LogDebug("Sending request to Claude API. Model: {Model}, Prompt length: {Length} chars",
            model, prompt.Length);

        var response = await _httpClient.PostAsync(
            $"{_baseUrl}/messages",
            new StringContent(json, Encoding.UTF8, "application/json"));

        var responseContent = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogError("Claude API request failed. Status: {StatusCode}, Response: {Response}",
                response.StatusCode, responseContent);
            throw new HttpRequestException(
                $"Claude API request failed with status {response.StatusCode}: {responseContent}");
        }

        var claudeResponse = JsonSerializer.Deserialize<ClaudeApiResponse>(
            responseContent,
            new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower });

        var content = claudeResponse?.Content?.FirstOrDefault()?.Text ?? string.Empty;
        var inputTokens = claudeResponse?.Usage?.InputTokens ?? 0;
        var outputTokens = claudeResponse?.Usage?.OutputTokens ?? 0;
        var totalTokens = inputTokens + outputTokens;

        _logger.LogInformation(
            "Claude API response received. Model: {Model}, Input tokens: {InputTokens}, Output tokens: {OutputTokens}",
            model, inputTokens, outputTokens);

        return new ClaudeResponse
        {
            Content = content,
            TokensUsed = totalTokens,
            Model = model
        };
    }
}

public class ClaudeRequest
{
    public string Model { get; set; } = string.Empty;
    public ClaudeMessage[] Messages { get; set; } = Array.Empty<ClaudeMessage>();
    public double Temperature { get; set; }
}

public class ClaudeMessage
{
    public string Role { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
}

public class ClaudeApiResponse
{
    public string Id { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public List<ClaudeContentBlock> Content { get; set; } = new();
    public ClaudeUsage? Usage { get; set; }
}

public class ClaudeContentBlock
{
    public string Type { get; set; } = string.Empty;
    public string Text { get; set; } = string.Empty;
}

public class ClaudeUsage
{
    public int InputTokens { get; set; }
    public int OutputTokens { get; set; }
}

public class ClaudeResponse
{
    public string Content { get; set; } = string.Empty;
    public int TokensUsed { get; set; }
    public string Model { get; set; } = string.Empty;
}
