namespace Backend.Models;

public class EmailAttachment
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    public string FileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = "application/octet-stream";
    public long SizeBytes { get; set; }
    // Stored as base64 string for direct preview/download or can be saved on disk
    public string Base64Data { get; set; } = string.Empty;
}
