using IntelliDesk.Application.Interfaces;
using IntelliDesk.Domain.Entities;
using IntelliDesk.Domain.Enums;
using IntelliDesk.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace IntelliDesk.Infrastructure.Repositories;

/// <summary>
/// Repository for ticket data access operations using Entity Framework Core.
/// </summary>
public class TicketRepository : ITicketRepository
{
    private readonly AppDbContext _context;

    public TicketRepository(AppDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Retrieves all tickets with optional filtering and pagination.
    /// </summary>
    public async Task<IEnumerable<Ticket>> GetAllAsync(string? status, string? priority, int page, int pageSize)
    {
        var query = _context.Tickets
            .Include(t => t.Customer)
            .Include(t => t.AssignedAgent)
            .AsQueryable();

        if (!string.IsNullOrEmpty(status) && Enum.TryParse<TicketStatus>(status, true, out var ticketStatus))
            query = query.Where(t => t.Status == ticketStatus);

        if (!string.IsNullOrEmpty(priority) && Enum.TryParse<TicketPriority>(priority, true, out var ticketPriority))
            query = query.Where(t => t.Priority == ticketPriority);

        return await query
            .OrderByDescending(t => t.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();
    }

    /// <summary>
    /// Retrieves a single ticket by ID.
    /// </summary>
    public async Task<Ticket?> GetByIdAsync(int id)
    {
        return await _context.Tickets
            .Include(t => t.Customer)
            .Include(t => t.AssignedAgent)
            .FirstOrDefaultAsync(t => t.Id == id);
    }

    /// <summary>
    /// Retrieves a ticket with all its comments loaded.
    /// </summary>
    public async Task<Ticket?> GetByIdWithCommentsAsync(int id)
    {
        return await _context.Tickets
            .Include(t => t.Customer)
            .Include(t => t.AssignedAgent)
            .Include(t => t.Comments.OrderBy(c => c.CreatedAt))
            .Include(t => t.Attachments)
            .FirstOrDefaultAsync(t => t.Id == id);
    }

    /// <summary>
    /// Retrieves all tickets for a specific customer.
    /// </summary>
    public async Task<IEnumerable<Ticket>> GetByCustomerIdAsync(int customerId)
    {
        return await _context.Tickets
            .Where(t => t.CustomerId == customerId)
            .OrderByDescending(t => t.CreatedAt)
            .ToListAsync();
    }

    /// <summary>
    /// Adds a new ticket to the database.
    /// </summary>
    public async Task<Ticket> AddAsync(Ticket ticket)
    {
        _context.Tickets.Add(ticket);
        await _context.SaveChangesAsync();
        return ticket;
    }

    /// <summary>
    /// Updates an existing ticket in the database.
    /// </summary>
    public async Task UpdateAsync(Ticket ticket)
    {
        _context.Tickets.Update(ticket);
        await _context.SaveChangesAsync();
    }

    /// <summary>
    /// Searches tickets by keyword across title, description, and comments.
    /// </summary>
    public async Task<IEnumerable<Ticket>> SearchAsync(string query)
    {
        var lowerQuery = query.ToLower();
        return await _context.Tickets
            .Include(t => t.Customer)
            .Where(t => t.Title.ToLower().Contains(lowerQuery) ||
                        t.Description.ToLower().Contains(lowerQuery) ||
                        t.Comments.Any(c => c.Content.ToLower().Contains(lowerQuery)))
            .OrderByDescending(t => t.UpdatedAt)
            .Take(50)
            .ToListAsync();
    }
}
