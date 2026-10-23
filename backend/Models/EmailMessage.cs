using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Backend.Models;

public class EmailMessage
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    [BsonElement("userId")]
    public string UserId { get; set; } = string.Empty;

    [BsonElement("folder")]
    public string Folder { get; set; } = "inbox"; // inbox, sent, drafts, trash

    [BsonElement("from")]
    public EmailAddress From { get; set; } = new();

    [BsonElement("to")]
    public List<EmailAddress> To { get; set; } = new();

    [BsonElement("cc")]
    public List<EmailAddress> Cc { get; set; } = new();

    [BsonElement("bcc")]
    public List<EmailAddress> Bcc { get; set; } = new();

    [BsonElement("subject")]
    public string Subject { get; set; } = string.Empty;

    [BsonElement("body")]
    public string Body { get; set; } = string.Empty;

    [BsonElement("snippet")]
    public string Snippet { get; set; } = string.Empty;

    [BsonElement("attachments")]
    public List<EmailAttachment> Attachments { get; set; } = new();

    [BsonElement("isRead")]
    public bool IsRead { get; set; } = false;

    [BsonElement("isStarred")]
    public bool IsStarred { get; set; } = false;

    [BsonElement("deliveryStatus")]
    public string DeliveryStatus { get; set; } = "Draft"; // Sent, Delivered, Failed, Received, Draft

    [BsonElement("deliveryError")]
    public string? DeliveryError { get; set; }

    [BsonElement("messageId")]
    public string? MessageId { get; set; }

    [BsonElement("inReplyTo")]
    public string? InReplyTo { get; set; }

    [BsonElement("references")]
    public string? References { get; set; }

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("sentAt")]
    public DateTime? SentAt { get; set; }
}
