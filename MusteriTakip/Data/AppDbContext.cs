using Microsoft.EntityFrameworkCore;
using MusteriTakip.Models;

namespace MusteriTakip.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<AppUser> Users => Set<AppUser>();
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<OrderRecord> OrderRecords => Set<OrderRecord>();
    public DbSet<OrderExpense> OrderExpenses => Set<OrderExpense>();
    public DbSet<Payment> Payments => Set<Payment>();
    public DbSet<Expense> Expenses => Set<Expense>();
    public DbSet<ExpenseTag> ExpenseTags => Set<ExpenseTag>();
    public DbSet<AppSetting> Settings => Set<AppSetting>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        base.OnModelCreating(b);

        b.Entity<AppUser>(e =>
        {
            e.HasIndex(x => x.UserName).IsUnique();
        });

        b.Entity<Customer>(e =>
        {
            e.HasIndex(x => x.Name);
            e.HasIndex(x => x.Code);
            e.HasQueryFilter(x => x.DeletedAt == null);
            e.HasMany(x => x.Records).WithOne(x => x.Customer!).HasForeignKey(x => x.CustomerId).OnDelete(DeleteBehavior.Cascade);
            e.HasMany(x => x.Payments).WithOne(x => x.Customer!).HasForeignKey(x => x.CustomerId).OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<OrderRecord>(e =>
        {
            e.HasIndex(x => x.Date);
            e.HasIndex(x => x.Code);
            e.HasQueryFilter(x => x.DeletedAt == null);
            e.HasMany(x => x.Expenses).WithOne(x => x.OrderRecord!).HasForeignKey(x => x.OrderRecordId).OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<Payment>(e =>
        {
            e.HasIndex(x => x.Date);
            e.HasQueryFilter(x => x.DeletedAt == null);
        });

        b.Entity<Expense>(e =>
        {
            e.HasIndex(x => x.Date);
            e.HasQueryFilter(x => x.DeletedAt == null);
            e.HasOne(x => x.Tag).WithMany().HasForeignKey(x => x.ExpenseTagId).OnDelete(DeleteBehavior.SetNull);
        });

        b.Entity<ExpenseTag>(e => e.HasIndex(x => x.Name).IsUnique());

        SeedData.Apply(b);
    }
}
