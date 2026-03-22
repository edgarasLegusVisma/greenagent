namespace IntelliDesk.Application.DTOs;

public class SmartReplyResponse
{
    /// <summary>
    /// The AI-generated reply suggestion.
    /// </summary>
    public string SuggestedReply { get; set; } = string.Empty;

    /// <summary>
    /// Confidence score from 0.0 to 1.0 indicating how suitable the reply is.
    /// </summary>
    public double Confidence { get; set; }

    /// <summary>
    /// The Claude model used for generation.
    /// </summary>
    public string ModelUsed { get; set; } = string.Empty;

    /// <summary>
    /// Total tokens consumed across all reflection passes.
    /// </summary>
    public int TokensUsed { get; set; }
}
