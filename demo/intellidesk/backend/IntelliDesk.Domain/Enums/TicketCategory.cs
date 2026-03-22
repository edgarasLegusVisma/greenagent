namespace IntelliDesk.Domain.Enums;

/// <summary>
/// Categorizes support tickets by their nature.
/// </summary>
public enum TicketCategory
{
    Billing = 0,
    Technical = 1,
    General = 2,
    FeatureRequest = 3,
    Bug = 4,
    Security = 5
}
