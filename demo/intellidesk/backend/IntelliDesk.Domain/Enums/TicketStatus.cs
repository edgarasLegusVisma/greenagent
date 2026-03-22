namespace IntelliDesk.Domain.Enums;

/// <summary>
/// Represents the lifecycle status of a support ticket.
/// </summary>
public enum TicketStatus
{
    New = 0,
    Open = 1,
    InProgress = 2,
    WaitingOnCustomer = 3,
    WaitingOnThirdParty = 4,
    Resolved = 5,
    Closed = 6
}
