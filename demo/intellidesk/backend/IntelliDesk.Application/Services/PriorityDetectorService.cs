using IntelliDesk.Application.Interfaces;
using IntelliDesk.Infrastructure.External;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace IntelliDesk.Application.Services;

/// <summary>
/// Automatically detects and classifies ticket priority using AI analysis
/// of the ticket content and conversation context.
/// </summary>
public class PriorityDetectorService : IPriorityDetectorService
{
    private readonly ClaudeApiClient _claudeClient;
    private readonly ITicketRepository _ticketRepository;
    private readonly IConfiguration _configuration;
    private readonly ILogger<PriorityDetectorService> _logger;

    public PriorityDetectorService(
        ClaudeApiClient claudeClient,
        ITicketRepository ticketRepository,
        IConfiguration configuration,
        ILogger<PriorityDetectorService> logger)
    {
        _claudeClient = claudeClient;
        _ticketRepository = ticketRepository;
        _configuration = configuration;
        _logger = logger;
    }

    /// <summary>
    /// Analyzes ticket content to determine the appropriate priority level.
    /// Returns one of: Critical, High, Medium, Low.
    /// </summary>
    public async Task<string> DetectPriorityAsync(int ticketId)
    {
        var ticket = await _ticketRepository.GetByIdWithCommentsAsync(ticketId)
            ?? throw new KeyNotFoundException($"Ticket {ticketId} not found");

        var model = _configuration["Claude:PriorityDetection:Model"] ?? "claude-sonnet-4-20250514";
        var temperature = _configuration.GetValue<double>("Claude:PriorityDetection:Temperature", 0.0);

        // Build full context including all comments and metadata
        var fullContext = $"""
            Ticket #{ticket.Id}
            Title: {ticket.Title}
            Category: {ticket.Category}
            Customer ID: {ticket.CustomerId}
            Created: {ticket.CreatedAt:yyyy-MM-dd HH:mm:ss UTC}

            Description:
            {ticket.Description}
            """;

        // Include all comments for context
        if (ticket.Comments.Any())
        {
            fullContext += "\n\nConversation History:\n";
            foreach (var comment in ticket.Comments.OrderBy(c => c.CreatedAt))
            {
                fullContext += $"""

                    [{comment.CreatedAt:yyyy-MM-dd HH:mm}] {comment.AuthorType}:
                    {comment.Content}
                    """;
            }
        }

        var prompt = $"""
            You are a support ticket priority classifier for IntelliDesk, a SaaS platform.

            Analyze the following support ticket and classify its priority.

            Consider these factors:
            - Business impact: Is the customer's business blocked?
            - Urgency: Are there time-sensitive deadlines mentioned?
            - Severity: Is there data loss, security risk, or system downtime?
            - Customer tone: Is the customer frustrated or escalating?
            - Scope: How many users or systems are affected?

            Priority levels:
            - Critical: System down, data loss, security breach, or complete business blocker
            - High: Significant functionality impaired, workaround difficult or unavailable
            - Medium: Feature issue with available workaround, or general inquiry
            - Low: Minor cosmetic issue, feature request, or general question

            Ticket to classify:

            {fullContext}

            Respond with exactly one word: Critical, High, Medium, or Low.
            """;

        _logger.LogInformation("Detecting priority for ticket {TicketId} using {Model}", ticketId, model);

        var response = await _claudeClient.SendMessageAsync(model, prompt, temperature);
        var priority = response.Content.Trim();

        // Validate the response is a valid priority
        var validPriorities = new[] { "Critical", "High", "Medium", "Low" };
        if (!validPriorities.Contains(priority, StringComparer.OrdinalIgnoreCase))
        {
            _logger.LogWarning("Invalid priority response '{Response}' for ticket {TicketId}, defaulting to Medium",
                priority, ticketId);
            priority = "Medium";
        }

        _logger.LogInformation("Ticket {TicketId} classified as {Priority}", ticketId, priority);
        return priority;
    }
}
