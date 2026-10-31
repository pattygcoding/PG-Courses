---
title: Models and migrations
summary: Configuring the model, and reading a migration before you apply it.
chapter: Data
minutes: 14
status: draft
---

## The model describes what the database holds

```csharp
public sealed class Order
{
    public int Id { get; set; }
    public string CustomerEmail { get; set; } = "";
    public DateTimeOffset PlacedAt { get; set; }
    public List<Line> Lines { get; } = [];
}
```

EF Core infers keys, relationships and column types from the class, then lets you override every one of those
guesses. The inference is a good starting point and a bad place to stop, because a string with no maximum length
becomes an unlimited column and a decimal with no precision becomes a float.

## Configuration in one place

```csharp
protected override void OnModelCreating(ModelBuilder modelBuilder)
{
    modelBuilder.Entity<Order>(entity =>
    {
        entity.HasKey(order => order.Id);
        entity.Property(order => order.CustomerEmail).HasMaxLength(320).IsRequired();
        entity.Property(order => order.PlacedAt).HasConversion<DateTimeOffsetToBinaryConverter>();
        entity.HasIndex(order => order.PlacedAt);
        entity.HasMany(order => order.Lines).WithOne().OnDelete(DeleteBehavior.Cascade);
    });
}
```

Attributes on the entity work too, and the fluent API expresses more: index names, delete behaviour, value
conversions and owned types. It also keeps persistence concerns out of the domain type, which is the reason to
prefer it once a model grows past a handful of rules.

## A migration is a change to review

```bash
dotnet ef migrations add AddOrderIndex
```

Read the generated file before applying it. Two changes look harmless and are not. A renamed property becomes a
drop and an add, which loses the column's data. A new non-nullable column with no default fails on any table that
already has rows. Both fixes belong in the migration itself:

```csharp
migrationBuilder.AddColumn<string>(
    name: "Currency",
    table: "Orders",
    type: "text",
    nullable: false,
    defaultValue: "USD");
```

Editing a migration you have not applied is normal and expected. Editing one that has shipped is not, because
the database has already recorded it as applied.

## Apply them deliberately

Calling `Database.Migrate()` at startup looks convenient and races the moment two instances start together, so
apply migrations as their own step in the pipeline, before the new version of the service takes traffic. A
migration that cannot be applied while the old version runs is a sign the change needs two deploys: add the new
column, then start using it.

## Check yourself

Add a property to an entity, generate the migration, and read it. Then add a non-nullable property without a
default against a table that has rows, and record what happens when you apply it.
