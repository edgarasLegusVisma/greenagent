using IntelliDesk.Application.DTOs;
using IntelliDesk.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace IntelliDesk.API.Controllers;

/// <summary>
/// Manages customer records and their associated ticket history.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class CustomersController : ControllerBase
{
    private readonly ICustomerService _customerService;
    private readonly ITicketService _ticketService;
    private readonly ILogger<CustomersController> _logger;

    public CustomersController(
        ICustomerService customerService,
        ITicketService ticketService,
        ILogger<CustomersController> logger)
    {
        _customerService = customerService;
        _ticketService = ticketService;
        _logger = logger;
    }

    /// <summary>
    /// Retrieves all customers with optional search filtering.
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<IEnumerable<CustomerDto>>> GetCustomers(
        [FromQuery] string? search = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 25)
    {
        var customers = await _customerService.GetAllAsync(search, page, pageSize);
        return Ok(customers);
    }

    /// <summary>
    /// Retrieves a specific customer by their identifier.
    /// </summary>
    [HttpGet("{id:int}")]
    public async Task<ActionResult<CustomerDto>> GetCustomer(int id)
    {
        var customer = await _customerService.GetByIdAsync(id);
        if (customer is null)
            return NotFound();

        return Ok(customer);
    }

    /// <summary>
    /// Retrieves all tickets associated with a specific customer.
    /// </summary>
    [HttpGet("{id:int}/tickets")]
    public async Task<ActionResult<IEnumerable<TicketDto>>> GetCustomerTickets(int id)
    {
        var customer = await _customerService.GetByIdAsync(id);
        if (customer is null)
            return NotFound();

        var tickets = await _ticketService.GetByCustomerAsync(id);
        return Ok(tickets);
    }

    /// <summary>
    /// Creates a new customer record.
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<CustomerDto>> CreateCustomer([FromBody] CreateCustomerRequest request)
    {
        var customer = await _customerService.CreateAsync(request);
        return CreatedAtAction(nameof(GetCustomer), new { id = customer.Id }, customer);
    }

    /// <summary>
    /// Updates an existing customer record.
    /// </summary>
    [HttpPut("{id:int}")]
    public async Task<ActionResult<CustomerDto>> UpdateCustomer(int id, [FromBody] UpdateCustomerRequest request)
    {
        var customer = await _customerService.UpdateAsync(id, request);
        if (customer is null)
            return NotFound();

        return Ok(customer);
    }

    /// <summary>
    /// Searches for customers by name, email, or company.
    /// </summary>
    [HttpGet("search")]
    public async Task<ActionResult<IEnumerable<CustomerDto>>> SearchCustomers([FromQuery] string query)
    {
        if (string.IsNullOrWhiteSpace(query))
            return BadRequest("Search query cannot be empty.");

        var results = await _customerService.SearchAsync(query);
        return Ok(results);
    }
}
