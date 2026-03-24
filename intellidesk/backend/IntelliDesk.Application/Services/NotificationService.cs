using IntelliDesk.Application.Interfaces;
using IntelliDesk.Domain.Entities;
using Microsoft.Extensions.Logging;

namespace IntelliDesk.Application.Services;

/// <summary>
/// Handles outbound notifications via email and Slack for ticket lifecycle events.
/// </summary>
public class NotificationService : INotificationService
{
    private readonly IEmailService _emailService;
    private readonly ISlackNotificationService _slackService;
    private readonly ILogger<NotificationService> _logger;

    public NotificationService(
        IEmailService emailService,
        ISlackNotificationService slackService,
        ILogger<NotificationService> logger)
    {
        _emailService = emailService;
        _slackService = slackService;
        _logger = logger;
    }

    /// <summary>
    /// Sends notifications when a new ticket is created.
    /// </summary>
    public async Task NotifyTicketCreatedAsync(Ticket ticket)
    {
        var subject = $"[IntelliDesk] New ticket #{ticket.Id}: {ticket.Title}";
        var body = $"""
            A new support ticket has been created.

            Ticket: #{ticket.Id}
            Title: {ticket.Title}
            Priority: {ticket.Priority}
            Customer ID: {ticket.CustomerId}

            Description:
            {ticket.Description}
            """;

        try
        {
            await _emailService.SendAsync("support-team@intellidesk.visma.com", subject, body);
            await _slackService.PostAsync($":ticket: New ticket #{ticket.Id}: *{ticket.Title}* (Priority: {ticket.Priority})");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send notification for ticket {TicketId}", ticket.Id);
            // Don't rethrow — notifications are non-critical
        }
    }

    /// <summary>
    /// Sends notifications when a ticket is assigned to an agent.
    /// </summary>
    public async Task NotifyTicketAssignedAsync(Ticket ticket, int agentId)
    {
        var subject = $"[IntelliDesk] Ticket #{ticket.Id} assigned to you";
        var body = $"""
            You have been assigned a support ticket.

            Ticket: #{ticket.Id}
            Title: {ticket.Title}
            Priority: {ticket.Priority}

            Please review and respond to the customer as soon as possible.
            """;

        try
        {
            // In production, resolve agent email from agentId
            await _emailService.SendAsync($"agent-{agentId}@intellidesk.visma.com", subject, body);
            await _slackService.PostAsync($":bust_in_silhouette: Ticket #{ticket.Id} assigned to Agent {agentId}");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send assignment notification for ticket {TicketId}", ticket.Id);
        }
    }

    /// <summary>
    /// Sends a notification when a ticket's priority is escalated.
    /// </summary>
    public async Task NotifyPriorityEscalationAsync(Ticket ticket, string previousPriority)
    {
        var message = $":rotating_light: Ticket #{ticket.Id} escalated from {previousPriority} to {ticket.Priority}: *{ticket.Title}*";

        try
        {
            await _slackService.PostAsync(message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send escalation notification for ticket {TicketId}", ticket.Id);
        }
    }
}
