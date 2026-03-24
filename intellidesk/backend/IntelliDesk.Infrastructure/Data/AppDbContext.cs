using IntelliDesk.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace IntelliDesk.Infrastructure.Data;

/// <summary>
/// Entity Framework Core database context for IntelliDesk.
/// </summary>
public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<Ticket> Tickets => Set<Ticket>();
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<SupportAgent> SupportAgents => Set<SupportAgent>();
    public DbSet<TicketComment> TicketComments => Set<TicketComment>();
    public DbSet<TicketAttachment> TicketAttachments => Set<TicketAttachment>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);

        // Global query filter for soft deletes could be added here
        // modelBuilder.Entity<Ticket>().HasQueryFilter(t => !t.IsDeleted);

        // Configure AuditLog
        modelBuilder.Entity<AuditLog>(entity =>
        {
            entity.ToTable("AuditLogs");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.EntityType).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Action).IsRequired().HasMaxLength(50);
            entity.Property(e => e.OldValues).HasColumnType("nvarchar(max)");
            entity.Property(e => e.NewValues).HasColumnType("nvarchar(max)");
            entity.Property(e => e.PerformedBy).IsRequired().HasMaxLength(200);
            entity.HasIndex(e => new { e.EntityType, e.EntityId });
            entity.HasIndex(e => e.Timestamp);
        });
    }

    /// <summary>
    /// Overrides SaveChanges to automatically set audit timestamps.
    /// </summary>
    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        var entries = ChangeTracker.Entries()
            .Where(e => e.State == EntityState.Added || e.State == EntityState.Modified);

        foreach (var entry in entries)
        {
            if (entry.Entity is Ticket ticket)
            {
                ticket.UpdatedAt = DateTime.UtcNow;
                if (entry.State == EntityState.Added)
                    ticket.CreatedAt = DateTime.UtcNow;
            }
            else if (entry.Entity is Customer customer && entry.State == EntityState.Added)
            {
                customer.CreatedAt = DateTime.UtcNow;
            }
        }

        return await base.SaveChangesAsync(cancellationToken);
    }
}
