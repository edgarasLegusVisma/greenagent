namespace IntelliDesk.Application.Interfaces;

/// <summary>
/// Automatically classifies ticket priority using AI analysis.
/// </summary>
public interface IPriorityDetectorService
{
    /// <summary>
    /// Analyzes a ticket's content and returns the detected priority level.
    /// Returns one of: Critical, High, Medium, Low.
    /// </summary>
    Task<string> DetectPriorityAsync(int ticketId);
}
