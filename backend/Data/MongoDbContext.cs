using Backend.Models;
using MongoDB.Driver;

namespace Backend.Data;

public class MongoDbContext
{
    private readonly IMongoDatabase _database;

    public MongoDbContext(IConfiguration configuration)
    {
        var connectionString = configuration["MongoDb:ConnectionString"] ?? "mongodb://127.0.0.1:27017";
        var databaseName = configuration["MongoDb:DatabaseName"] ?? "EmailProDb";

        var client = new MongoClient(connectionString);
        _database = client.GetDatabase(databaseName);

        CreateIndexes();
    }

    public IMongoCollection<User> Users => _database.GetCollection<User>("Users");
    public IMongoCollection<EmailMessage> Emails => _database.GetCollection<EmailMessage>("Emails");

    private void CreateIndexes()
    {
        try
        {
            // Users: Unique index on Email
            var userEmailIndex = new CreateIndexModel<User>(
                Builders<User>.IndexKeys.Ascending(u => u.Email),
                new CreateIndexOptions { Unique = true, Background = true }
            );
            Users.Indexes.CreateOne(userEmailIndex);

            // Emails: Compound index for listing emails by user and folder sorted by date
            var folderIndex = new CreateIndexModel<EmailMessage>(
                Builders<EmailMessage>.IndexKeys
                    .Ascending(e => e.UserId)
                    .Ascending(e => e.Folder)
                    .Descending(e => e.CreatedAt),
                new CreateIndexOptions { Background = true }
            );
            Emails.Indexes.CreateOne(folderIndex);

            // Emails: Index for unread filter
            var unreadIndex = new CreateIndexModel<EmailMessage>(
                Builders<EmailMessage>.IndexKeys
                    .Ascending(e => e.UserId)
                    .Ascending(e => e.IsRead),
                new CreateIndexOptions { Background = true }
            );
            Emails.Indexes.CreateOne(unreadIndex);
        }
        catch (Exception)
        {
            // If already exists or in replica set initialization, ignore
        }
    }
}
