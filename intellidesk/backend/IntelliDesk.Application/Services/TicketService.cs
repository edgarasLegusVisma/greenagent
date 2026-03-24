using AutoMapper;
using IntelliDesk.Application.DTOs;
using IntelliDesk.Application.Interfaces;
using IntelliDesk.Domain.Entities;
using IntelliDesk.Domain.Enums;
using Microsoft.Extensions.Logging;

namespace IntelliDesk.Application.Services;

/// <summary>
/// Core service handling all ticket lifecycle operations including creation,
/// assignment, status transitions, and search functionality.
/// </summary>
public class TicketService : ITicketService
{
    private readonly ITicketRepository _ticketRepository;
    private readonly INotificationService _notificationService;
    private readonly IMapper _mapper;
    private readonly ILogger<TicketService> _logger;

    public TicketService(
        ITicketRepository ticketRepository,
        INotificationService notificationService,
        IMapper mapper,
        ILogger<TicketService> logger)
    {
        _ticketRepository = ticketRepository;
        _notificationService = notificationService;
        _mapper = mapper;
        _logger = logger;
    }

    /// <summary>
    /// Creates a new support ticket and triggers notifications.
    /// </summary>
    public async Task<TicketDto> CreateAsync(CreateTicketRequest request)
    {
        var ticket = new Ticket
        {
            Title = request.Title,
            Description = request.Description,
            CustomerId = request.CustomerId,
            Status = TicketStatus.New,
            Priority = request.Priority.HasValue
                ? Enum.Parse<TicketPriority>(request.Priority)
                : TicketPriority.Medium,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        var created = await _ticketRepository.AddAsync(ticket);
        _logger.LogInformation("Created ticket {TicketId} for customer {CustomerId}", created.Id, request.CustomerId);

        await _notificationService.NotifyTicketCreatedAsync(created);

        return _mapper.Map<TicketDto>(created);
    }

    /// <summary>
    /// Retrieves all tickets with optional status and priority filtering.
    /// </summary>
    public async Task<IEnumerable<TicketDto>> GetAllAsync(string? status, string? priority, int page, int pageSize)
    {
        var tickets = await _ticketRepository.GetAllAsync(status, priority, page, pageSize);
        return _mapper.Map<IEnumerable<TicketDto>>(tickets);
    }

    /// <summary>
    /// Retrieves a single ticket by its identifier, including all comments.
    /// </summary>
    public async Task<TicketDto?> GetByIdAsync(int id)
    {
        var ticket = await _ticketRepository.GetByIdWithCommentsAsync(id);
        return ticket is null ? null : _mapper.Map<TicketDto>(ticket);
    }

    /// <summary>
    /// Assigns a ticket to a support agent and updates status to InProgress.
    /// </summary>
    public async Task<TicketDto?> AssignAsync(int ticketId, int agentId)
    {
        var ticket = await _ticketRepository.GetByIdAsync(ticketId);
        if (ticket is null) return null;

        ticket.AssignedAgentId = agentId;
        ticket.Status = TicketStatus.InProgress;
        ticket.UpdatedAt = DateTime.UtcNow;

        await _ticketRepository.UpdateAsync(ticket);
        await _notificationService.NotifyTicketAssignedAsync(ticket, agentId);

        _logger.LogInformation("Ticket {TicketId} assigned to agent {AgentId}", ticketId, agentId);
        return _mapper.Map<TicketDto>(ticket);
    }

    /// <summary>
    /// Closes a ticket and records the resolution timestamp.
    /// </summary>
    public async Task<TicketDto?> CloseAsync(int ticketId)
    {
        var ticket = await _ticketRepository.GetByIdAsync(ticketId);
        if (ticket is null) return null;

        ticket.Status = TicketStatus.Closed;
        ticket.ResolvedAt = DateTime.UtcNow;
        ticket.UpdatedAt = DateTime.UtcNow;

        await _ticketRepository.UpdateAsync(ticket);
        _logger.LogInformation("Ticket {TicketId} closed", ticketId);

        return _mapper.Map<TicketDto>(ticket);
    }

    /// <summary>
    /// Reopens a previously closed or resolved ticket.
    /// </summary>
    public async Task<TicketDto?> ReopenAsync(int ticketId)
    {
        var ticket = await _ticketRepository.GetByIdAsync(ticketId);
        if (ticket is null) return null;

        ticket.Status = TicketStatus.Open;
        ticket.ResolvedAt = null;
        ticket.UpdatedAt = DateTime.UtcNow;

        await _ticketRepository.UpdateAsync(ticket);
        _logger.LogInformation("Ticket {TicketId} reopened", ticketId);

        return _mapper.Map<TicketDto>(ticket);
    }

    /// <summary>
    /// Retrieves all tickets belonging to a specific customer.
    /// </summary>
    public async Task<IEnumerable<TicketDto>> GetByCustomerAsync(int customerId)
    {
        var tickets = await _ticketRepository.GetByCustomerIdAsync(customerId);
        return _mapper.Map<IEnumerable<TicketDto>>(tickets);
    }

    /// <summary>
    /// Searches tickets by keyword across title, description, and comments.
    /// </summary>
    public async Task<IEnumerable<TicketDto>> SearchAsync(string query)
    {
        var tickets = await _ticketRepository.SearchAsync(query);
        return _mapper.Map<IEnumerable<TicketDto>>(tickets);
    }

    /// <summary>
    /// Updates ticket priority based on AI detection results.
    /// </summary>
    public async Task<TicketDto> UpdatePriorityAsync(int ticketId, string priority)
    {
        var ticket = await _ticketRepository.GetByIdAsync(ticketId)
            ?? throw new KeyNotFoundException($"Ticket {ticketId} not found");

        ticket.Priority = Enum.Parse<TicketPriority>(priority, ignoreCase: true);
        ticket.UpdatedAt = DateTime.UtcNow;

        await _ticketRepository.UpdateAsync(ticket);
        return _mapper.Map<TicketDto>(ticket);
    }
}
