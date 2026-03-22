using IntelliDesk.Application.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Text;
using System.Text.Json;

namespace IntelliDesk.Infrastructure.External;

/// <summary>
/// Posts notifications to Slack channels via incoming webhooks.
/// </summary>
public class SlackNotificationService : ISlackNotificationService
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    private readonly ILogger<SlackNotificationService> _logger;

    public SlackNotificationService(IConfiguration configuration, ILogger<SlackNotificationService> logger)
    {
        _httpClient = new HttpClient();
        _configuration = configuration;
        _logger = logger;
    }

    /// <summary>
    /// Posts a text message to the configured Slack channel.
    /// </summary>
    public async Task PostAsync(string message)
    {
        var webhookUrl = _configuration["Slack:WebhookUrl"]
            ?? throw new InvalidOperationException("Slack webhook URL is not configured.");
        var channel = _configuration["Slack:Channel"] ?? "#support-alerts";

        var payload = new
        {
            channel,
            text = message,
            username = "IntelliDesk Bot",
            icon_emoji = ":robot_face:"
        };

        var json = JsonSerializer.Serialize(payload);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        try
        {
            var response = await _httpClient.PostAsync(webhookUrl, content);
            response.EnsureSuccessStatusCode();
            _logger.LogInformation("Slack notification sent to {Channel}: {MessagePreview}",
                channel, message.Length > 100 ? message[..100] + "..." : message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send Slack notification to {Channel}", channel);
            throw;
        }
    }

    /// <summary>
    /// Posts a rich block message to Slack with formatting.
    /// </summary>
    public async Task PostBlockAsync(string title, string body, string color = "#2196F3")
    {
        var webhookUrl = _configuration["Slack:WebhookUrl"]
            ?? throw new InvalidOperationException("Slack webhook URL is not configured.");
        var channel = _configuration["Slack:Channel"] ?? "#support-alerts";

        var payload = new
        {
            channel,
            attachments = new[]
            {
                new
                {
                    color,
                    title,
                    text = body,
                    footer = "IntelliDesk",
                    ts = DateTimeOffset.UtcNow.ToUnixTimeSeconds()
                }
            }
        };

        var json = JsonSerializer.Serialize(payload);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        try
        {
            var response = await _httpClient.PostAsync(webhookUrl, content);
            response.EnsureSuccessStatusCode();
            _logger.LogInformation("Slack block notification sent: {Title}", title);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send Slack block notification: {Title}", title);
            throw;
        }
    }
}
