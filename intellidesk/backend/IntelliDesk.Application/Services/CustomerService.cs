using AutoMapper;
using IntelliDesk.Application.DTOs;
using IntelliDesk.Application.Interfaces;
using IntelliDesk.Domain.Entities;
using Microsoft.Extensions.Logging;

namespace IntelliDesk.Application.Services;

/// <summary>
/// Manages customer records including CRUD operations, search, and duplicate merging.
/// </summary>
public class CustomerService : ICustomerService
{
    private readonly ICustomerRepository _customerRepository;
    private readonly IMapper _mapper;
    private readonly ILogger<CustomerService> _logger;

    public CustomerService(
        ICustomerRepository customerRepository,
        IMapper mapper,
        ILogger<CustomerService> logger)
    {
        _customerRepository = customerRepository;
        _mapper = mapper;
        _logger = logger;
    }

    /// <summary>
    /// Retrieves all customers with optional search and pagination.
    /// </summary>
    public async Task<IEnumerable<CustomerDto>> GetAllAsync(string? search, int page, int pageSize)
    {
        var customers = await _customerRepository.GetAllAsync(search, page, pageSize);
        return _mapper.Map<IEnumerable<CustomerDto>>(customers);
    }

    /// <summary>
    /// Retrieves a specific customer by their identifier.
    /// </summary>
    public async Task<CustomerDto?> GetByIdAsync(int id)
    {
        var customer = await _customerRepository.GetByIdAsync(id);
        return customer is null ? null : _mapper.Map<CustomerDto>(customer);
    }

    /// <summary>
    /// Creates a new customer record.
    /// </summary>
    public async Task<CustomerDto> CreateAsync(CreateCustomerRequest request)
    {
        var customer = new Customer
        {
            Name = request.Name,
            Email = request.Email,
            Company = request.Company,
            Phone = request.Phone,
            CreatedAt = DateTime.UtcNow
        };

        var created = await _customerRepository.AddAsync(customer);
        _logger.LogInformation("Created customer {CustomerId}: {Email}", created.Id, created.Email);

        return _mapper.Map<CustomerDto>(created);
    }

    /// <summary>
    /// Updates an existing customer record.
    /// </summary>
    public async Task<CustomerDto?> UpdateAsync(int id, UpdateCustomerRequest request)
    {
        var customer = await _customerRepository.GetByIdAsync(id);
        if (customer is null) return null;

        customer.Name = request.Name ?? customer.Name;
        customer.Email = request.Email ?? customer.Email;
        customer.Company = request.Company ?? customer.Company;
        customer.Phone = request.Phone ?? customer.Phone;

        await _customerRepository.UpdateAsync(customer);
        _logger.LogInformation("Updated customer {CustomerId}", id);

        return _mapper.Map<CustomerDto>(customer);
    }

    /// <summary>
    /// Searches for customers by name, email, or company name.
    /// </summary>
    public async Task<IEnumerable<CustomerDto>> SearchAsync(string query)
    {
        var customers = await _customerRepository.SearchAsync(query);
        return _mapper.Map<IEnumerable<CustomerDto>>(customers);
    }

    /// <summary>
    /// Finds a customer by their email address.
    /// </summary>
    public async Task<CustomerDto?> FindByEmailAsync(string email)
    {
        var customer = await _customerRepository.FindByEmailAsync(email);
        return customer is null ? null : _mapper.Map<CustomerDto>(customer);
    }

    /// <summary>
    /// Merges duplicate customer records, consolidating tickets and history.
    /// </summary>
    public async Task<CustomerDto> MergeDuplicatesAsync(int primaryId, int duplicateId)
    {
        var primary = await _customerRepository.GetByIdAsync(primaryId)
            ?? throw new KeyNotFoundException($"Primary customer {primaryId} not found");

        var duplicate = await _customerRepository.GetByIdAsync(duplicateId)
            ?? throw new KeyNotFoundException($"Duplicate customer {duplicateId} not found");

        await _customerRepository.MergeAsync(primaryId, duplicateId);
        _logger.LogInformation("Merged customer {DuplicateId} into {PrimaryId}", duplicateId, primaryId);

        var merged = await _customerRepository.GetByIdAsync(primaryId);
        return _mapper.Map<CustomerDto>(merged!);
    }
}
