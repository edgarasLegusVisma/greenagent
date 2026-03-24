using IntelliDesk.Application.DTOs;
using IntelliDesk.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace IntelliDesk.API.Controllers;

/// <summary>
/// Manages support agents, their availability, and performance statistics.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AgentsController : ControllerBase
{
    private readonly IAgentService _agentService;
    private readonly ILogger<AgentsController> _logger;

    public AgentsController(IAgentService agentService, ILogger<AgentsController> logger)
    {
        _agentService = agentService;
        _logger = logger;
    }

    /// <summary>
    /// Retrieves all support agents with optional department filtering.
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<IEnumerable<AgentDto>>> GetAgents([FromQuery] string? department = null)
    {
        var agents = await _agentService.GetAllAsync(department);
        return Ok(agents);
    }

    /// <summary>
    /// Retrieves a specific support agent by their identifier.
    /// </summary>
    [HttpGet("{id:int}")]
    public async Task<ActionResult<AgentDto>> GetAgent(int id)
    {
        var agent = await _agentService.GetByIdAsync(id);
        if (agent is null)
            return NotFound();

        return Ok(agent);
    }

    /// <summary>
    /// Retrieves performance statistics for a specific support agent.
    /// </summary>
    [HttpGet("{id:int}/stats")]
    public async Task<ActionResult<AgentStatsDto>> GetAgentStats(int id)
    {
        var agent = await _agentService.GetByIdAsync(id);
        if (agent is null)
            return NotFound();

        var stats = await _agentService.GetStatsAsync(id);
        return Ok(stats);
    }

    /// <summary>
    /// Updates the availability status of a support agent.
    /// </summary>
    [HttpPost("{id:int}/availability")]
    public async Task<ActionResult> SetAvailability(int id, [FromBody] SetAvailabilityRequest request)
    {
        var agent = await _agentService.GetByIdAsync(id);
        if (agent is null)
            return NotFound();

        await _agentService.SetAvailabilityAsync(id, request.IsAvailable);
        _logger.LogInformation("Agent {AgentId} availability set to {IsAvailable}", id, request.IsAvailable);
        return NoContent();
    }
}

public record AgentDto(
    int Id,
    string Name,
    string Email,
    string Department,
    bool IsAvailable,
    int MaxConcurrentTickets,
    int CurrentTicketCount);

public record AgentStatsDto(
    int TotalTicketsHandled,
    double AverageResolutionTimeHours,
    double CustomerSatisfactionScore,
    int TicketsResolvedThisWeek,
    Dictionary<string, int> TicketsByCategory);

public record SetAvailabilityRequest(bool IsAvailable);
