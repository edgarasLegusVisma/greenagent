namespace IntelliDesk.Application.Interfaces;

/// <summary>
/// Generates AI-powered summaries of ticket conversation threads.
/// </summary>
public interface IAutoSummaryService
{
    /// <summary>
    /// Generates a comprehensive summary of the ticket's conversation history.
    /// </summary>
    Task<string> SummarizeAsync(int ticketId);
}
