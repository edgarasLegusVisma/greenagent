using IntelliDesk.Application.DTOs;

namespace IntelliDesk.Application.Interfaces;

/// <summary>
/// Defines operations for managing the complete ticket lifecycle.
/// </summary>
public interface ITicketService
{
    Task<TicketDto> CreateAsync(CreateTicketRequest request);
    Task<IEnumerable<TicketDto>> GetAllAsync(string? status, string? priority, int page, int pageSize);
    Task<TicketDto?> GetByIdAsync(int id);
    Task<TicketDto?> UpdateAsync(int id, UpdateTicketRequest request);
    Task<TicketDto?> AssignAsync(int ticketId, int agentId);
    Task<TicketDto?> CloseAsync(int ticketId);
    Task<TicketDto?> ReopenAsync(int ticketId);
    Task<IEnumerable<TicketDto>> GetByCustomerAsync(int customerId);
    Task<IEnumerable<TicketDto>> SearchAsync(string query);
    Task<TicketDto> UpdatePriorityAsync(int ticketId, string priority);
    Task<TicketDto?> FindByEmailThreadIdAsync(string threadId);
    Task AddCommentAsync(int ticketId, string content, int authorId, string authorType);
    Task<DashboardStatsDto> GetDashboardStatsAsync();
    Task<double> GetAverageSentimentAsync(int days);
    Task<List<SentimentDataPoint>> GetSentimentTrendAsync(int days);
    Task<int> GetNegativeSentimentCountAsync(int days);
}

public class SentimentDataPoint
{
    public DateTime Date { get; set; }
    public double Score { get; set; }
}
