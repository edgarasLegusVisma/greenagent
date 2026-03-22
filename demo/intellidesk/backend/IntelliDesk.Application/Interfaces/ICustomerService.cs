using IntelliDesk.Application.DTOs;

namespace IntelliDesk.Application.Interfaces;

/// <summary>
/// Defines operations for managing customer records.
/// </summary>
public interface ICustomerService
{
    Task<IEnumerable<CustomerDto>> GetAllAsync(string? search, int page, int pageSize);
    Task<CustomerDto?> GetByIdAsync(int id);
    Task<CustomerDto> CreateAsync(CreateCustomerRequest request);
    Task<CustomerDto?> UpdateAsync(int id, UpdateCustomerRequest request);
    Task<IEnumerable<CustomerDto>> SearchAsync(string query);
    Task<CustomerDto?> FindByEmailAsync(string email);
    Task<CustomerDto> MergeDuplicatesAsync(int primaryId, int duplicateId);
}
