using IntelliDesk.Application.DTOs;
using IntelliDesk.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace IntelliDesk.API.Controllers;

/// <summary>
/// Manages support tickets including AI-powered features like smart replies and auto-summarization.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TicketsController : ControllerBase
{
    private readonly ITicketService _ticketService;
    private readonly ISmartReplyService _smartReplyService;
    private readonly IPriorityDetectorService _priorityDetectorService;
    private readonly IAutoSummaryService _autoSummaryService;
    private readonly ILogger<TicketsController> _logger;

    public TicketsController(
        ITicketService ticketService,
        ISmartReplyService smartReplyService,
        IPriorityDetectorService priorityDetectorService,
        IAutoSummaryService autoSummaryService,
        ILogger<TicketsController> logger)
    {
        _ticketService = ticketService;
        _smartReplyService = smartReplyService;
        _priorityDetectorService = priorityDetectorService;
        _autoSummaryService = autoSummaryService;
        _logger = logger;
    }

    /// <summary>
    /// Retrieves all tickets with optional filtering and pagination.
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<IEnumerable<TicketDto>>> GetTickets(
        [FromQuery] string? status = null,
        [FromQuery] string? priority = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 25)
    {
        var tickets = await _ticketService.GetAllAsync(status, priority, page, pageSize);
        return Ok(tickets);
    }

    /// <summary>
    /// Retrieves a specific ticket by its identifier.
    /// </summary>
    [HttpGet("{id:int}")]
    public async Task<ActionResult<TicketDto>> GetTicket(int id)
    {
        var ticket = await _ticketService.GetByIdAsync(id);
        if (ticket is null)
            return NotFound();

        return Ok(ticket);
    }

    /// <summary>
    /// Creates a new support ticket. Automatically detects priority using AI if not specified.
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<TicketDto>> CreateTicket([FromBody] CreateTicketRequest request)
    {
        var ticket = await _ticketService.CreateAsync(request);

        // Auto-detect priority if not provided
        if (request.Priority is null)
        {
            _logger.LogInformation("Auto-detecting priority for ticket {TicketId}", ticket.Id);
            var detectedPriority = await _priorityDetectorService.DetectPriorityAsync(ticket.Id);
            ticket = await _ticketService.UpdatePriorityAsync(ticket.Id, detectedPriority);
        }

        return CreatedAtAction(nameof(GetTicket), new { id = ticket.Id }, ticket);
    }

    /// <summary>
    /// Updates an existing ticket.
    /// </summary>
    [HttpPut("{id:int}")]
    public async Task<ActionResult<TicketDto>> UpdateTicket(int id, [FromBody] UpdateTicketRequest request)
    {
        var ticket = await _ticketService.UpdateAsync(id, request);
        if (ticket is null)
            return NotFound();

        return Ok(ticket);
    }

    /// <summary>
    /// Assigns a ticket to a support agent.
    /// </summary>
    [HttpPost("{id:int}/assign")]
    public async Task<ActionResult<TicketDto>> AssignTicket(int id, [FromBody] AssignTicketRequest request)
    {
        var ticket = await _ticketService.AssignAsync(id, request.AgentId);
        if (ticket is null)
            return NotFound();

        return Ok(ticket);
    }

    /// <summary>
    /// Generates an AI-powered smart reply suggestion for a ticket.
    /// </summary>
    [HttpPost("{id:int}/smart-reply")]
    public async Task<ActionResult<SmartReplyResponse>> GenerateSmartReply(int id)
    {
        var ticketExists = await _ticketService.GetByIdAsync(id);
        if (ticketExists is null)
            return NotFound();

        _logger.LogInformation("Generating smart reply for ticket {TicketId}", id);
        var reply = await _smartReplyService.GenerateReplyAsync(id);
        return Ok(reply);
    }

    /// <summary>
    /// Generates an AI-powered summary of the ticket conversation thread.
    /// </summary>
    [HttpPost("{id:int}/auto-summarize")]
    public async Task<ActionResult<string>> AutoSummarize(int id)
    {
        var ticketExists = await _ticketService.GetByIdAsync(id);
        if (ticketExists is null)
            return NotFound();

        _logger.LogInformation("Auto-summarizing ticket {TicketId}", id);
        var summary = await _autoSummaryService.SummarizeAsync(id);
        return Ok(new { summary });
    }

    /// <summary>
    /// Closes a ticket and marks it as resolved.
    /// </summary>
    [HttpPost("{id:int}/close")]
    public async Task<ActionResult<TicketDto>> CloseTicket(int id)
    {
        var ticket = await _ticketService.CloseAsync(id);
        if (ticket is null)
            return NotFound();

        return Ok(ticket);
    }

    /// <summary>
    /// Reopens a previously closed ticket.
    /// </summary>
    [HttpPost("{id:int}/reopen")]
    public async Task<ActionResult<TicketDto>> ReopenTicket(int id)
    {
        var ticket = await _ticketService.ReopenAsync(id);
        if (ticket is null)
            return NotFound();

        return Ok(ticket);
    }
}
