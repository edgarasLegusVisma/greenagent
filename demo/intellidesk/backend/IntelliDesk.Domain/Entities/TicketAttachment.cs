namespace IntelliDesk.Domain.Entities;

/// <summary>
/// Represents a file attachment associated with a support ticket.
/// </summary>
public class TicketAttachment
{
    public int Id { get; set; }
    public int TicketId { get; set; }
    public string FileName { get; set; } = string.Empty;
    public long FileSize { get; set; }
    public string ContentType { get; set; } = string.Empty;
    public string StoragePath { get; set; } = string.Empty;
    public DateTime UploadedAt { get; set; }

    // Navigation properties
    public Ticket Ticket { get; set; } = null!;
}
