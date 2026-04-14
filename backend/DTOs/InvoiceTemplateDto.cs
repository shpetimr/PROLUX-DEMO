using System;
using System.Collections.Generic;

namespace backend.DTOs
{
    public class InvoiceTemplateDto
    {
        public string CompanyName { get; set; } = "";
        public string CompanySlogan { get; set; } = "";
        public string CompanyLogoUrl { get; set; } = "";
        public string CompanyAddress { get; set; } = "";
        public string CompanyPhone { get; set; } = "";
        public string CompanyBankInfo { get; set; } = "";
        public string CustomerName { get; set; } = "";
        public string CustomerAddress { get; set; } = "";
        public DateTime Date { get; set; }
        public List<InvoiceItemDto> Items { get; set; } = new();
        public string Description { get; set; } = "";
        public decimal Total { get; set; }
    }

    public class InvoiceItemDto
    {
        public int ItemNumber { get; set; }
        public string Name { get; set; } = "";
        public string Materials { get; set; } = "";
        public string Unit { get; set; } = ""; // m2/pcs
        public decimal Price { get; set; }
        public decimal Total { get; set; }
    }
} 