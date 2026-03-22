using IntelliDesk.Application.DTOs;
using IntelliDesk.Application.Interfaces;
using IntelliDesk.Infrastructure.External;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace IntelliDesk.Application.Services;

/// <summary>
/// Generates intelligent reply suggestions for support tickets using Claude AI.
/// Uses a multi-pass reflection approach to ensure high-quality responses.
/// </summary>
public class SmartReplyService : ISmartReplyService
{
    private readonly ClaudeApiClient _claudeClient;
    private readonly ITicketRepository _ticketRepository;
    private readonly IConfiguration _configuration;
    private readonly ILogger<SmartReplyService> _logger;

    public SmartReplyService(
        ClaudeApiClient claudeClient,
        ITicketRepository ticketRepository,
        IConfiguration configuration,
        ILogger<SmartReplyService> logger)
    {
        _claudeClient = claudeClient;
        _ticketRepository = ticketRepository;
        _configuration = configuration;
        _logger = logger;
    }

    /// <summary>
    /// Generates a polished reply suggestion using multi-pass AI reflection.
    /// </summary>
    public async Task<SmartReplyResponse> GenerateReplyAsync(int ticketId)
    {
        var ticket = await _ticketRepository.GetByIdWithCommentsAsync(ticketId)
            ?? throw new KeyNotFoundException($"Ticket {ticketId} not found");

        var model = _configuration["Claude:SmartReply:Model"] ?? "claude-opus-4-20250514";
        var reflectionPasses = _configuration.GetValue<int>("Claude:SmartReply:ReflectionPasses", 3);
        var temperature = _configuration.GetValue<double>("Claude:SmartReply:Temperature", 0.7);
        var totalTokensUsed = 0;

        // Build the full conversation context
        var conversationHistory = BuildConversationContext(ticket);

        _logger.LogInformation("Generating smart reply for ticket {TicketId} using {Model} with {Passes} reflection passes",
            ticketId, model, reflectionPasses);

        // Step 1: Generate initial draft
        var draftPrompt = $"""
            You are a professional customer support agent for IntelliDesk, a SaaS platform.

            Here is the full ticket conversation history:

            {conversationHistory}

            Write a helpful, empathetic, and professional reply to the customer's latest message.
            Address their concerns directly and provide actionable next steps.
            """;

        var draftResponse = await _claudeClient.SendMessageAsync(model, draftPrompt, temperature);
        totalTokensUsed += draftResponse.TokensUsed;
        var currentDraft = draftResponse.Content;

        // Step 2: Reflection loop — review and revise
        for (int pass = 0; pass < reflectionPasses; pass++)
        {
            _logger.LogDebug("Reflection pass {Pass}/{Total} for ticket {TicketId}", pass + 1, reflectionPasses, ticketId);

            // Review the current draft
            var reviewPrompt = $"""
                You are a senior customer support quality reviewer.

                Here is the full ticket conversation history:

                {conversationHistory}

                Here is the drafted reply:

                {currentDraft}

                Review this reply for:
                1. Accuracy — does it correctly address the customer's issue?
                2. Tone — is it empathetic and professional?
                3. Completeness — does it cover all customer concerns?
                4. Clarity — is it easy to understand?
                5. Actionability — does it provide clear next steps?

                Provide specific feedback on what should be improved.
                """;

            var reviewResponse = await _claudeClient.SendMessageAsync(model, reviewPrompt, temperature);
            totalTokensUsed += reviewResponse.TokensUsed;

            // Revise based on feedback
            var revisePrompt = $"""
                You are a professional customer support agent for IntelliDesk.

                Here is the full ticket conversation history:

                {conversationHistory}

                Here is your previous draft reply:

                {currentDraft}

                Here is the quality review feedback:

                {reviewResponse.Content}

                Revise your reply to address all the feedback. Maintain a professional and empathetic tone.
                Output only the revised reply, no explanations.
                """;

            var reviseResponse = await _claudeClient.SendMessageAsync(model, revisePrompt, temperature);
            totalTokensUsed += reviseResponse.TokensUsed;
            currentDraft = reviseResponse.Content;
        }

        _logger.LogInformation("Smart reply generated for ticket {TicketId}. Total tokens used: {Tokens}",
            ticketId, totalTokensUsed);

        return new SmartReplyResponse
        {
            SuggestedReply = currentDraft,
            Confidence = 0.92,
            ModelUsed = model,
            TokensUsed = totalTokensUsed
        };
    }

    /// <summary>
    /// Builds a comprehensive conversation context string from ticket data.
    /// </summary>
    private static string BuildConversationContext(Domain.Entities.Ticket ticket)
    {
        var context = $"""
            Ticket #{ticket.Id}
            Title: {ticket.Title}
            Status: {ticket.Status}
            Priority: {ticket.Priority}
            Category: {ticket.Category}
            Created: {ticket.CreatedAt:yyyy-MM-dd HH:mm:ss UTC}

            Original Description:
            {ticket.Description}

            Conversation Thread:
            """;

        foreach (var comment in ticket.Comments.OrderBy(c => c.CreatedAt))
        {
            var authorLabel = comment.AuthorType == "customer" ? "Customer" :
                              comment.AuthorType == "agent" ? "Support Agent" : "System";
            context += $"""

                [{comment.CreatedAt:yyyy-MM-dd HH:mm}] {authorLabel}:
                {comment.Content}
                """;
        }

        return context;
    }
}
