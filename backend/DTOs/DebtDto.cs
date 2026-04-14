using System.ComponentModel.DataAnnotations;
using backend.Models;

namespace backend.DTOs
{
    public class CreateDebtDto
    {
        [Required]
        [StringLength(200)]
        public string debtorName { get; set; } = string.Empty;
        
        [Required]
        public DebtType type { get; set; }
        
        [Required]
        [Range(0, double.MaxValue)]
        public decimal amount { get; set; }
        
        [Required]
        public string dueDate { get; set; } = string.Empty;
        
        [StringLength(500)]
        public string? description { get; set; }
    }
    
    public class UpdateDebtDto
    {
        [StringLength(200)]
        public string? debtorName { get; set; }
        
        public DebtType? type { get; set; }
        
        [Range(0, double.MaxValue)]
        public decimal? amount { get; set; }
        
        public string? dueDate { get; set; }
        
        [StringLength(500)]
        public string? description { get; set; }
        
        public bool? isPaid { get; set; }
        
        public string? paidDate { get; set; }
    }
    
    public class DebtResponseDto
    {
        public int id { get; set; }
        public string debtorName { get; set; } = string.Empty;
        public DebtType type { get; set; }
        public decimal amount { get; set; } = 0;
        public DateTime dueDate { get; set; }
        public string? description { get; set; }
        public bool isPaid { get; set; } = false;
        public DateTime? paidDate { get; set; }
        public DateTime createdAt { get; set; }
        public DateTime? updatedAt { get; set; }
        public string currencyCode { get; set; } = "MKD";
        public string currencySymbol { get; set; } = "MKD";
    }
    
    public class DebtSummaryDto
    {
        public decimal totalOwedToCompany { get; set; } = 0;
        public decimal totalCompanyOwes { get; set; } = 0;
        public decimal netDebt { get; set; } = 0;
        public int totalDebts { get; set; } = 0;
        public int paidDebts { get; set; } = 0;
        public int unpaidDebts { get; set; } = 0;
        public int overdueDebts { get; set; } = 0;
        public string currencyCode { get; set; } = "MKD";
        public string currencySymbol { get; set; } = "MKD";
    }
    
    public class DebtTypeBreakdownDto
    {
        public DebtType type { get; set; }
        public decimal totalAmount { get; set; } = 0;
        public int count { get; set; } = 0;
        public int paidCount { get; set; } = 0;
        public int unpaidCount { get; set; } = 0;
        public int overdueCount { get; set; } = 0;
        public string currencyCode { get; set; } = "MKD";
        public string currencySymbol { get; set; } = "MKD";
    }
} 