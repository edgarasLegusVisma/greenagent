using IntelliDesk.Application.Services;

namespace IntelliDesk.Application.Interfaces;

/// <summary>
/// Tracks customer sentiment across ticket conversations using AI analysis.
/// </summary>
public interface ISentimentTrackerService
{
    /// <summary>
    /// Analyzes the sentiment of a customer message within the context of a ticket conversation.
    /// </summary>
    Task<SentimentResult> AnalyzeSentimentAsync(int ticketId, string message);
}
