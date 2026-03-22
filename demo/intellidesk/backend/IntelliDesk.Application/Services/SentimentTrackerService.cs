using IntelliDesk.Application.Interfaces;
using IntelliDesk.Infrastructure.External;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace IntelliDesk.Application.Services;

/// <summary>
/// Tracks customer sentiment throughout ticket conversations to identify
/// escalation risks and measure customer satisfaction in real time.
/// </summary>
public class SentimentTrackerService : ISentimentTrackerService
{
    private readonly ClaudeApiClient _claudeClient;
    private readonly ITicketRepository _ticketRepository;
    private readonly IConfiguration _configuration;
    private readonly ILogger<SentimentTrackerService> _logger;

    public SentimentTrackerService(
        ClaudeApiClient claudeClient,
        ITicketRepository ticketRepository,
        IConfiguration configuration,
        ILogger<SentimentTrackerService> logger)
    {
        _claudeClient = claudeClient;
        _ticketRepository = ticketRepository;
        _configuration = configuration;
        _logger = logger;
    }

    /// <summary>
    /// Analyzes the sentiment of a customer message within the context of the full ticket conversation.
    /// Returns a score from -1.0 (very negative) to 1.0 (very positive).
    /// </summary>
    public async Task<SentimentResult> AnalyzeSentimentAsync(int ticketId, string message)
    {
        var ticket = await _ticketRepository.GetByIdWithCommentsAsync(ticketId)
            ?? throw new KeyNotFoundException($"Ticket {ticketId} not found");

        var model = _configuration["Claude:SentimentAnalysis:Model"] ?? "claude-sonnet-4-20250514";
        var temperature = _configuration.GetValue<double>("Claude:SentimentAnalysis:Temperature", 0.0);

        // Build the full conversation context for sentiment analysis
        var conversationContext = $"""
            Ticket #{ticket.Id}
            Title: {ticket.Title}
            Status: {ticket.Status}
            Priority: {ticket.Priority}
            Category: {ticket.Category}
            Created: {ticket.CreatedAt:yyyy-MM-dd HH:mm:ss UTC}

            Original Description:
            {ticket.Description}

            """;

        // Include the entire conversation history for context
        if (ticket.Comments.Any())
        {
            conversationContext += "Full Conversation History:\n";
            foreach (var comment in ticket.Comments.OrderBy(c => c.CreatedAt))
            {
                var authorLabel = comment.AuthorType == "customer" ? "Customer" :
                                  comment.AuthorType == "agent" ? "Support Agent" : "System";

                conversationContext += $"""

                    [{comment.CreatedAt:yyyy-MM-dd HH:mm}] {authorLabel}:
                    {comment.Content}

                    """;
            }
        }

        var prompt = $"""
            You are a customer sentiment analysis system for IntelliDesk.

            Analyze the sentiment of the latest customer message in the context of the full
            conversation history. Consider:

            1. The emotional tone of the latest message
            2. How sentiment has changed over the conversation
            3. Signs of frustration, satisfaction, urgency, or confusion
            4. Whether the customer's concerns are being addressed

            Full conversation context:

            {conversationContext}

            Latest message to analyze:
            "{message}"

            Respond in the following JSON format:
            {{
                "score": <float from -1.0 to 1.0>,
                "label": "<negative|neutral|positive>",
                "confidence": <float from 0.0 to 1.0>,
                "escalation_risk": "<low|medium|high>",
                "key_emotions": ["<emotion1>", "<emotion2>"],
                "reasoning": "<brief explanation>"
            }}
            """;

        _logger.LogInformation("Analyzing sentiment for ticket {TicketId} using {Model}", ticketId, model);

        var response = await _claudeClient.SendMessageAsync(model, prompt, temperature);

        // Parse the JSON response
        var sentimentData = System.Text.Json.JsonSerializer.Deserialize<SentimentJsonResponse>(
            response.Content,
            new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true });

        var result = new SentimentResult
        {
            Score = sentimentData?.Score ?? 0.0,
            Label = sentimentData?.Label ?? "neutral",
            Confidence = sentimentData?.Confidence ?? 0.5,
            EscalationRisk = sentimentData?.EscalationRisk ?? "low",
            KeyEmotions = sentimentData?.KeyEmotions ?? new List<string>(),
            TokensUsed = response.TokensUsed
        };

        _logger.LogInformation(
            "Sentiment for ticket {TicketId}: {Score} ({Label}), Escalation risk: {Risk}. Tokens: {Tokens}",
            ticketId, result.Score, result.Label, result.EscalationRisk, result.TokensUsed);

        return result;
    }
}

public class SentimentResult
{
    public double Score { get; set; }
    public string Label { get; set; } = string.Empty;
    public double Confidence { get; set; }
    public string EscalationRisk { get; set; } = string.Empty;
    public List<string> KeyEmotions { get; set; } = new();
    public int TokensUsed { get; set; }
}

internal class SentimentJsonResponse
{
    public double Score { get; set; }
    public string Label { get; set; } = string.Empty;
    public double Confidence { get; set; }
    public string EscalationRisk { get; set; } = string.Empty;
    public List<string> KeyEmotions { get; set; } = new();
    public string Reasoning { get; set; } = string.Empty;
}
