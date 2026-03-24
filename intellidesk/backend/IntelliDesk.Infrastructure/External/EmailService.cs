using IntelliDesk.Application.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Net;
using System.Net.Mail;

namespace IntelliDesk.Infrastructure.External;

/// <summary>
/// Sends transactional emails via SMTP for ticket notifications and customer communications.
/// </summary>
public class EmailService : IEmailService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<EmailService> _logger;

    public EmailService(IConfiguration configuration, ILogger<EmailService> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    /// <summary>
    /// Sends an email to the specified recipient.
    /// </summary>
    public async Task SendAsync(string to, string subject, string body)
    {
        var smtpHost = _configuration["Email:SmtpHost"]
            ?? throw new InvalidOperationException("SMTP host is not configured.");
        var smtpPort = _configuration.GetValue<int>("Email:SmtpPort", 587);
        var fromAddress = _configuration["Email:FromAddress"] ?? "noreply@intellidesk.visma.com";
        var fromName = _configuration["Email:FromName"] ?? "IntelliDesk";

        using var client = new SmtpClient(smtpHost, smtpPort)
        {
            EnableSsl = true,
            Credentials = new NetworkCredential(
                _configuration["Email:Username"],
                _configuration["Email:Password"])
        };

        var message = new MailMessage
        {
            From = new MailAddress(fromAddress, fromName),
            Subject = subject,
            Body = body,
            IsBodyHtml = false
        };
        message.To.Add(to);

        try
        {
            await client.SendMailAsync(message);
            _logger.LogInformation("Email sent to {Recipient}: {Subject}", to, subject);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send email to {Recipient}: {Subject}", to, subject);
            throw;
        }
    }

    /// <summary>
    /// Sends a templated email with variable substitution.
    /// </summary>
    public async Task SendTemplatedAsync(string to, string templateName, Dictionary<string, string> variables)
    {
        // In production, load template from storage and substitute variables
        var subject = variables.GetValueOrDefault("subject", "IntelliDesk Notification");
        var body = variables.GetValueOrDefault("body", string.Empty);

        foreach (var (key, value) in variables)
        {
            body = body.Replace($"{{{{{key}}}}}", value);
        }

        await SendAsync(to, subject, body);
    }
}
