using IntelliDesk.Application.Interfaces;
using IntelliDesk.Infrastructure.External;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace IntelliDesk.Application.Services;

/// <summary>
/// Generates concise summaries of ticket conversation threads using AI,
/// helping agents quickly understand ticket context without reading the full history.
/// </summary>
public class AutoSummaryService : IAutoSummaryService
{
    private readonly ClaudeApiClient _claudeClient;
    private readonly ITicketRepository _ticketRepository;
    private readonly IConfiguration _configuration;
    private readonly ILogger<AutoSummaryService> _logger;

    public AutoSummaryService(
        ClaudeApiClient claudeClient,
        ITicketRepository ticketRepository,
        IConfiguration configuration,
        ILogger<AutoSummaryService> logger)
    {
        _claudeClient = claudeClient;
        _ticketRepository = ticketRepository;
        _configuration = configuration;
        _logger = logger;
    }

    /// <summary>
    /// Generates a comprehensive summary of the ticket's conversation thread.
    /// </summary>
    public async Task<string> SummarizeAsync(int ticketId)
    {
        var ticket = await _ticketRepository.GetByIdWithCommentsAsync(ticketId)
            ?? throw new KeyNotFoundException($"Ticket {ticketId} not found");

        var model = _configuration["Claude:AutoSummary:Model"] ?? "claude-sonnet-4-20250514";
        var temperature = _configuration.GetValue<double>("Claude:AutoSummary:Temperature", 0.3);

        // Build the complete ticket context including all metadata and conversation
        var ticketContext = $"""
            Ticket Information:
            - ID: #{ticket.Id}
            - Title: {ticket.Title}
            - Status: {ticket.Status}
            - Priority: {ticket.Priority}
            - Category: {ticket.Category}
            - Customer ID: {ticket.CustomerId}
            - Assigned Agent ID: {ticket.AssignedAgentId?.ToString() ?? "Unassigned"}
            - Created: {ticket.CreatedAt:yyyy-MM-dd HH:mm:ss UTC}
            - Last Updated: {ticket.UpdatedAt:yyyy-MM-dd HH:mm:ss UTC}
            - Resolved: {ticket.ResolvedAt?.ToString("yyyy-MM-dd HH:mm:ss UTC") ?? "Not yet resolved"}

            Original Description:
            {ticket.Description}

            """;

        // Include the full conversation history with all metadata
        if (ticket.Comments.Any())
        {
            ticketContext += "Complete Conversation Thread:\n";
            ticketContext += new string('-', 60) + "\n";

            foreach (var comment in ticket.Comments.OrderBy(c => c.CreatedAt))
            {
                var authorLabel = comment.AuthorType switch
                {
                    "customer" => "Customer",
                    "agent" => "Support Agent",
                    "system" => "System",
                    _ => comment.AuthorType
                };

                var visibility = comment.IsInternal ? " [INTERNAL NOTE]" : "";

                ticketContext += $"""

                    [{comment.CreatedAt:yyyy-MM-dd HH:mm:ss}] {authorLabel} (ID: {comment.AuthorId}){visibility}:
                    {comment.Content}

                    """;
            }
        }

        // Include attachment information
        if (ticket.Attachments.Any())
        {
            ticketContext += "\nAttachments:\n";
            foreach (var attachment in ticket.Attachments)
            {
                ticketContext += $"- {attachment.FileName} ({attachment.ContentType}, {attachment.FileSize} bytes, uploaded {attachment.UploadedAt:yyyy-MM-dd HH:mm})\n";
            }
        }

        var prompt = $"""
            You are a support ticket summarizer for IntelliDesk.

            Summarize the following support ticket thread. Include:
            1. The core issue the customer is facing
            2. Key actions taken by the support team
            3. Current status and any pending items
            4. Any important context or constraints mentioned
            5. Resolution details if the ticket has been resolved

            Provide a clear, concise summary that allows a new agent to quickly
            understand the full context of this ticket.

            {ticketContext}
            """;

        _logger.LogInformation("Generating summary for ticket {TicketId} using {Model}", ticketId, model);

        var response = await _claudeClient.SendMessageAsync(model, prompt, temperature);

        _logger.LogInformation("Summary generated for ticket {TicketId}. Tokens used: {Tokens}",
            ticketId, response.TokensUsed);

        return response.Content;
    }
}
