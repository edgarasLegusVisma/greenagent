using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace IntelliDesk.Infrastructure.Data.Migrations;

/// <inheritdoc />
public partial class InitialCreate : Migration
{
    /// <inheritdoc />
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "Customers",
            columns: table => new
            {
                Id = table.Column<int>(type: "int", nullable: false)
                    .Annotation("SqlServer:Identity", "1, 1"),
                Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                Email = table.Column<string>(type: "nvarchar(254)", maxLength: 254, nullable: false),
                Company = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                Phone = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
            },
            constraints: table => table.PrimaryKey("PK_Customers", x => x.Id));

        migrationBuilder.CreateTable(
            name: "SupportAgents",
            columns: table => new
            {
                Id = table.Column<int>(type: "int", nullable: false)
                    .Annotation("SqlServer:Identity", "1, 1"),
                Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                Email = table.Column<string>(type: "nvarchar(254)", maxLength: 254, nullable: false),
                Department = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                IsAvailable = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
                MaxConcurrentTickets = table.Column<int>(type: "int", nullable: false, defaultValue: 10),
                CurrentTicketCount = table.Column<int>(type: "int", nullable: false, defaultValue: 0)
            },
            constraints: table => table.PrimaryKey("PK_SupportAgents", x => x.Id));

        migrationBuilder.CreateTable(
            name: "Tickets",
            columns: table => new
            {
                Id = table.Column<int>(type: "int", nullable: false)
                    .Annotation("SqlServer:Identity", "1, 1"),
                Title = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                Description = table.Column<string>(type: "nvarchar(max)", nullable: false),
                Status = table.Column<int>(type: "int", nullable: false),
                Priority = table.Column<int>(type: "int", nullable: false),
                Category = table.Column<int>(type: "int", nullable: true),
                CustomerId = table.Column<int>(type: "int", nullable: false),
                AssignedAgentId = table.Column<int>(type: "int", nullable: true),
                CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                ResolvedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_Tickets", x => x.Id);
                table.ForeignKey("FK_Tickets_Customers_CustomerId", x => x.CustomerId, "Customers", "Id", onDelete: ReferentialAction.Restrict);
                table.ForeignKey("FK_Tickets_SupportAgents_AssignedAgentId", x => x.AssignedAgentId, "SupportAgents", "Id", onDelete: ReferentialAction.SetNull);
            });

        migrationBuilder.CreateTable(
            name: "TicketComments",
            columns: table => new
            {
                Id = table.Column<int>(type: "int", nullable: false)
                    .Annotation("SqlServer:Identity", "1, 1"),
                TicketId = table.Column<int>(type: "int", nullable: false),
                AuthorId = table.Column<int>(type: "int", nullable: false),
                AuthorType = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                Content = table.Column<string>(type: "nvarchar(max)", nullable: false),
                CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                IsInternal = table.Column<bool>(type: "bit", nullable: false, defaultValue: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_TicketComments", x => x.Id);
                table.ForeignKey("FK_TicketComments_Tickets_TicketId", x => x.TicketId, "Tickets", "Id", onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateTable(
            name: "TicketAttachments",
            columns: table => new
            {
                Id = table.Column<int>(type: "int", nullable: false)
                    .Annotation("SqlServer:Identity", "1, 1"),
                TicketId = table.Column<int>(type: "int", nullable: false),
                FileName = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                FileSize = table.Column<long>(type: "bigint", nullable: false),
                ContentType = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                StoragePath = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                UploadedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_TicketAttachments", x => x.Id);
                table.ForeignKey("FK_TicketAttachments_Tickets_TicketId", x => x.TicketId, "Tickets", "Id", onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateTable(
            name: "AuditLogs",
            columns: table => new
            {
                Id = table.Column<int>(type: "int", nullable: false)
                    .Annotation("SqlServer:Identity", "1, 1"),
                EntityType = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                EntityId = table.Column<int>(type: "int", nullable: false),
                Action = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                OldValues = table.Column<string>(type: "nvarchar(max)", nullable: true),
                NewValues = table.Column<string>(type: "nvarchar(max)", nullable: true),
                PerformedBy = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                Timestamp = table.Column<DateTime>(type: "datetime2", nullable: false)
            },
            constraints: table => table.PrimaryKey("PK_AuditLogs", x => x.Id));

        // Indexes
        migrationBuilder.CreateIndex("IX_Tickets_CustomerId", "Tickets", "CustomerId");
        migrationBuilder.CreateIndex("IX_Tickets_AssignedAgentId", "Tickets", "AssignedAgentId");
        migrationBuilder.CreateIndex("IX_Tickets_Status", "Tickets", "Status");
        migrationBuilder.CreateIndex("IX_Tickets_Priority", "Tickets", "Priority");
        migrationBuilder.CreateIndex("IX_Tickets_CreatedAt", "Tickets", "CreatedAt");
        migrationBuilder.CreateIndex("IX_TicketComments_TicketId", "TicketComments", "TicketId");
        migrationBuilder.CreateIndex("IX_TicketAttachments_TicketId", "TicketAttachments", "TicketId");
        migrationBuilder.CreateIndex("IX_Customers_Email", "Customers", "Email", unique: true);
        migrationBuilder.CreateIndex("IX_SupportAgents_Email", "SupportAgents", "Email", unique: true);
        migrationBuilder.CreateIndex("IX_AuditLogs_EntityType_EntityId", "AuditLogs", new[] { "EntityType", "EntityId" });
        migrationBuilder.CreateIndex("IX_AuditLogs_Timestamp", "AuditLogs", "Timestamp");
    }

    /// <inheritdoc />
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "AuditLogs");
        migrationBuilder.DropTable(name: "TicketAttachments");
        migrationBuilder.DropTable(name: "TicketComments");
        migrationBuilder.DropTable(name: "Tickets");
        migrationBuilder.DropTable(name: "SupportAgents");
        migrationBuilder.DropTable(name: "Customers");
    }
}
