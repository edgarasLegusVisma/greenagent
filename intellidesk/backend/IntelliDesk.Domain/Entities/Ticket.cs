using IntelliDesk.Domain.Enums;

namespace IntelliDesk.Domain.Entities;

/// <summary>
/// Represents a customer support ticket in the system.
/// </summary>
public class Ticket
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public TicketStatus Status { get; set; }
    public TicketPriority Priority { get; set; }
    public TicketCategory? Category { get; set; }
    public int CustomerId { get; set; }
    public int? AssignedAgentId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? ResolvedAt { get; set; }

    // Navigation properties
    public Customer Customer { get; set; } = null!;
    public SupportAgent? AssignedAgent { get; set; }
    public ICollection<TicketComment> Comments { get; set; } = new List<TicketComment>();
    public ICollection<TicketAttachment> Attachments { get; set; } = new List<TicketAttachment>();
}
