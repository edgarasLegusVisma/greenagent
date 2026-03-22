using IntelliDesk.Application.DTOs;
using IntelliDesk.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace IntelliDesk.API.Controllers;

/// <summary>
/// Handles incoming webhooks from external integrations like email and Slack.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class WebhooksController : ControllerBase
{
    private readonly ITicketService _ticketService;
    private readonly ICustomerService _customerService;
    private readonly ISentimentTrackerService _sentimentTracker;
    private readonly IPriorityDetectorService _priorityDetector;
    private readonly ILogger<WebhooksController> _logger;

    public WebhooksController(
        ITicketService ticketService,
        ICustomerService customerService,
        ISentimentTrackerService sentimentTracker,
        IPriorityDetectorService priorityDetector,
        ILogger<WebhooksController> logger)
    {
        _ticketService = ticketService;
        _customerService = customerService;
        _sentimentTracker = sentimentTracker;
        _priorityDetector = priorityDetector;
        _logger = logger;
    }

    /// <summary>
    /// Processes incoming email webhooks to create or update tickets.
    /// </summary>
    [HttpPost("email")]
    public async Task<ActionResult> HandleEmailWebhook([FromBody] EmailWebhookPayload payload)
    {
        _logger.LogInformation("Received email webhook from {Sender}", payload.From);

        // Find or create customer
        var customer = await _customerService.FindByEmailAsync(payload.From);
        if (customer is null)
        {
            customer = await _customerService.CreateAsync(new CreateCustomerRequest
            {
                Name = payload.FromName,
                Email = payload.From,
                Company = "Unknown"
            });
        }

        // Check if this is a reply to an existing ticket
        var existingTicket = await _ticketService.FindByEmailThreadIdAsync(payload.ThreadId);
        if (existingTicket is not null)
        {
            await _ticketService.AddCommentAsync(existingTicket.Id, payload.Body, customer.Id, "customer");

            // Analyze sentiment of the new message
            await _sentimentTracker.AnalyzeSentimentAsync(existingTicket.Id, payload.Body);

            return Ok(new { action = "comment_added", ticketId = existingTicket.Id });
        }

        // Create new ticket from email
        var ticket = await _ticketService.CreateAsync(new CreateTicketRequest
        {
            Title = payload.Subject,
            Description = payload.Body,
            CustomerId = customer.Id
        });

        // Auto-detect priority
        var priority = await _priorityDetector.DetectPriorityAsync(ticket.Id);
        await _ticketService.UpdatePriorityAsync(ticket.Id, priority);

        // Analyze initial sentiment
        await _sentimentTracker.AnalyzeSentimentAsync(ticket.Id, payload.Body);

        _logger.LogInformation("Created ticket {TicketId} from email webhook", ticket.Id);
        return Ok(new { action = "ticket_created", ticketId = ticket.Id });
    }

    /// <summary>
    /// Processes incoming Slack integration events.
    /// </summary>
    [HttpPost("slack")]
    public async Task<ActionResult> HandleSlackWebhook([FromBody] SlackWebhookPayload payload)
    {
        // Handle Slack URL verification challenge
        if (payload.Type == "url_verification")
            return Ok(new { challenge = payload.Challenge });

        if (payload.Type != "event_callback")
            return Ok();

        _logger.LogInformation("Received Slack event: {EventType}", payload.Event?.Type);

        if (payload.Event?.Type == "message" && !string.IsNullOrEmpty(payload.Event.Text))
        {
            // Create ticket from Slack message if it contains a support keyword
            var supportKeywords = new[] { "help", "issue", "bug", "broken", "error", "problem" };
            if (supportKeywords.Any(k => payload.Event.Text.Contains(k, StringComparison.OrdinalIgnoreCase)))
            {
                var ticket = await _ticketService.CreateAsync(new CreateTicketRequest
                {
                    Title = $"Slack support request from {payload.Event.User}",
                    Description = payload.Event.Text,
                    CustomerId = 0 // Will be resolved by the service layer
                });

                _logger.LogInformation("Created ticket {TicketId} from Slack message", ticket.Id);
            }
        }

        return Ok();
    }
}

public class EmailWebhookPayload
{
    public string From { get; set; } = string.Empty;
    public string FromName { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public string? ThreadId { get; set; }
    public List<EmailAttachment> Attachments { get; set; } = new();
}

public class EmailAttachment
{
    public string FileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public string Base64Content { get; set; } = string.Empty;
}

public class SlackWebhookPayload
{
    public string Type { get; set; } = string.Empty;
    public string? Challenge { get; set; }
    public SlackEvent? Event { get; set; }
}

public class SlackEvent
{
    public string Type { get; set; } = string.Empty;
    public string User { get; set; } = string.Empty;
    public string Text { get; set; } = string.Empty;
    public string Channel { get; set; } = string.Empty;
}
