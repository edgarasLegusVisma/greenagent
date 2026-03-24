namespace IntelliDesk.Domain.Entities;

/// <summary>
/// Represents a human support agent who handles customer tickets.
/// </summary>
public class SupportAgent
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Department { get; set; } = string.Empty;
    public bool IsAvailable { get; set; } = true;
    public int MaxConcurrentTickets { get; set; } = 10;
    public int CurrentTicketCount { get; set; }

    // Navigation properties
    public ICollection<Ticket> AssignedTickets { get; set; } = new List<Ticket>();
}
