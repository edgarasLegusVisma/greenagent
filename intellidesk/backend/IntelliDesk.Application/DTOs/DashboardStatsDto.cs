namespace IntelliDesk.Application.DTOs;

public class DashboardStatsDto
{
    public int TotalTickets { get; set; }
    public int OpenTickets { get; set; }
    public int InProgressTickets { get; set; }
    public int ResolvedTickets { get; set; }
    public double AvgResolutionTimeHours { get; set; }
    public double SentimentScore { get; set; }
    public Dictionary<string, int> TopCategories { get; set; } = new();
    public Dictionary<string, int> TicketsByPriority { get; set; } = new();
    public int TicketsCreatedToday { get; set; }
    public int TicketsResolvedToday { get; set; }
}
