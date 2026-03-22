using IntelliDesk.Application.Interfaces;
using IntelliDesk.Domain.Entities;
using IntelliDesk.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace IntelliDesk.Infrastructure.Repositories;

/// <summary>
/// Repository for customer data access operations using Entity Framework Core.
/// </summary>
public class CustomerRepository : ICustomerRepository
{
    private readonly AppDbContext _context;

    public CustomerRepository(AppDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Retrieves all customers with optional search and pagination.
    /// </summary>
    public async Task<IEnumerable<Customer>> GetAllAsync(string? search, int page, int pageSize)
    {
        var query = _context.Customers
            .Include(c => c.Tickets)
            .AsQueryable();

        if (!string.IsNullOrEmpty(search))
        {
            var lowerSearch = search.ToLower();
            query = query.Where(c =>
                c.Name.ToLower().Contains(lowerSearch) ||
                c.Email.ToLower().Contains(lowerSearch) ||
                (c.Company != null && c.Company.ToLower().Contains(lowerSearch)));
        }

        return await query
            .OrderBy(c => c.Name)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();
    }

    /// <summary>
    /// Retrieves a single customer by ID.
    /// </summary>
    public async Task<Customer?> GetByIdAsync(int id)
    {
        return await _context.Customers
            .Include(c => c.Tickets)
            .FirstOrDefaultAsync(c => c.Id == id);
    }

    /// <summary>
    /// Adds a new customer to the database.
    /// </summary>
    public async Task<Customer> AddAsync(Customer customer)
    {
        _context.Customers.Add(customer);
        await _context.SaveChangesAsync();
        return customer;
    }

    /// <summary>
    /// Updates an existing customer in the database.
    /// </summary>
    public async Task UpdateAsync(Customer customer)
    {
        _context.Customers.Update(customer);
        await _context.SaveChangesAsync();
    }

    /// <summary>
    /// Searches for customers by name, email, or company.
    /// </summary>
    public async Task<IEnumerable<Customer>> SearchAsync(string query)
    {
        var lowerQuery = query.ToLower();
        return await _context.Customers
            .Where(c =>
                c.Name.ToLower().Contains(lowerQuery) ||
                c.Email.ToLower().Contains(lowerQuery) ||
                (c.Company != null && c.Company.ToLower().Contains(lowerQuery)))
            .OrderBy(c => c.Name)
            .Take(25)
            .ToListAsync();
    }

    /// <summary>
    /// Finds a customer by their email address.
    /// </summary>
    public async Task<Customer?> FindByEmailAsync(string email)
    {
        return await _context.Customers
            .Include(c => c.Tickets)
            .FirstOrDefaultAsync(c => c.Email.ToLower() == email.ToLower());
    }

    /// <summary>
    /// Merges a duplicate customer into a primary customer record.
    /// </summary>
    public async Task MergeAsync(int primaryId, int duplicateId)
    {
        // Move all tickets from duplicate to primary customer
        var duplicateTickets = await _context.Tickets
            .Where(t => t.CustomerId == duplicateId)
            .ToListAsync();

        foreach (var ticket in duplicateTickets)
        {
            ticket.CustomerId = primaryId;
        }

        // Remove the duplicate customer
        var duplicate = await _context.Customers.FindAsync(duplicateId);
        if (duplicate is not null)
        {
            _context.Customers.Remove(duplicate);
        }

        await _context.SaveChangesAsync();
    }
}
