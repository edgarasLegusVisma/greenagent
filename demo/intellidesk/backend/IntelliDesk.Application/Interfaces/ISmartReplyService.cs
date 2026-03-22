using IntelliDesk.Application.DTOs;

namespace IntelliDesk.Application.Interfaces;

/// <summary>
/// Generates AI-powered reply suggestions for support tickets.
/// </summary>
public interface ISmartReplyService
{
    /// <summary>
    /// Generates a suggested reply for the given ticket using AI analysis.
    /// </summary>
    Task<SmartReplyResponse> GenerateReplyAsync(int ticketId);
}
