using System.ComponentModel.DataAnnotations;

namespace IntelliDesk.Application.DTOs;

public class CreateTicketRequest
{
    [Required]
    [StringLength(200, MinimumLength = 5)]
    public string Title { get; set; } = string.Empty;

    [Required]
    [StringLength(10000, MinimumLength = 10)]
    public string Description { get; set; } = string.Empty;

    [Required]
    public int CustomerId { get; set; }

    /// <summary>
    /// Optional priority override. If not specified, AI will auto-detect.
    /// Valid values: Critical, High, Medium, Low.
    /// </summary>
    public string? Priority { get; set; }

    public string? Category { get; set; }
}
