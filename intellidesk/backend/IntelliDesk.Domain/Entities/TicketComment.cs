namespace IntelliDesk.Domain.Entities;

/// <summary>
/// Represents a comment or message within a ticket conversation thread.
/// </summary>
public class TicketComment
{
    public int Id { get; set; }
    public int TicketId { get; set; }
    public int AuthorId { get; set; }
    public string AuthorType { get; set; } = string.Empty; // "customer", "agent", "system"
    public string Content { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public bool IsInternal { get; set; }

    // Navigation properties
    public Ticket Ticket { get; set; } = null!;
}
