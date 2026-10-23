namespace Backend.Models;

public class EmailAddress
{
    public string Name { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;

    public EmailAddress() { }

    public EmailAddress(string address, string name = "")
    {
        Address = address;
        Name = string.IsNullOrWhiteSpace(name) ? address : name;
    }
}
