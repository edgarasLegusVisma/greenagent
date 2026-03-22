using IntelliDesk.Application.DTOs;
using IntelliDesk.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace IntelliDesk.API.Controllers;

/// <summary>
/// Provides aggregated dashboard statistics for the support platform.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DashboardController : ControllerBase
{
    private readonly ITicketService _ticketService;
    private readonly ISentimentTrackerService _sentimentTracker;
    private readonly IAgentService _agentService;
    private readonly ILogger<DashboardController> _logger;

    public DashboardController(
        ITicketService ticketService,
        ISentimentTrackerService sentimentTracker,
        IAgentService agentService,
        ILogger<DashboardController> logger)
    {
        _ticketService = ticketService;
        _sentimentTracker = sentimentTracker;
        _agentService = agentService;
        _logger = logger;
    }

    /// <summary>
    /// Retrieves overall dashboard statistics including ticket counts and resolution metrics.
    /// </summary>
    [HttpGet("stats")]
    public async Task<ActionResult<DashboardStatsDto>> GetStats()
    {
        _logger.LogInformation("Fetching dashboard statistics");
        var stats = await _ticketService.GetDashboardStatsAsync();
        return Ok(stats);
    }

    /// <summary>
    /// Retrieves sentiment analysis overview across all recent tickets.
    /// </summary>
    [HttpGet("sentiment-overview")]
    public async Task<ActionResult<SentimentOverviewDto>> GetSentimentOverview(
        [FromQuery] int days = 30)
    {
        var overview = new SentimentOverviewDto
        {
            Period = $"Last {days} days",
            AverageSentiment = await _ticketService.GetAverageSentimentAsync(days),
            SentimentTrend = await _ticketService.GetSentimentTrendAsync(days),
            NegativeSentimentTickets = await _ticketService.GetNegativeSentimentCountAsync(days)
        };

        return Ok(overview);
    }

    /// <summary>
    /// Retrieves performance metrics for all support agents.
    /// </summary>
    [HttpGet("agent-performance")]
    public async Task<ActionResult<IEnumerable<AgentPerformanceDto>>> GetAgentPerformance(
        [FromQuery] int days = 30)
    {
        var performance = await _agentService.GetPerformanceOverviewAsync(days);
        return Ok(performance);
    }
}

public class SentimentOverviewDto
{
    public string Period { get; set; } = string.Empty;
    public double AverageSentiment { get; set; }
    public List<SentimentDataPoint> SentimentTrend { get; set; } = new();
    public int NegativeSentimentTickets { get; set; }
}

public class SentimentDataPoint
{
    public DateTime Date { get; set; }
    public double Score { get; set; }
}

public record AgentPerformanceDto(
    int AgentId,
    string AgentName,
    int TicketsResolved,
    double AverageResolutionHours,
    double SatisfactionScore);
