using backend.DTOs;
using Microsoft.EntityFrameworkCore;

namespace backend.Services
{
    public class InvoiceStockDeductionStageResult
    {
        public InvoiceStockDeductionResultDto Result { get; set; } = new();
        public string? ErrorMessage { get; set; }
        public bool HasPendingDeductions { get; set; }
    }

    public interface IInvoiceStockDeductionService
    {
        Task<InvoiceStockDeductionStageResult> StageInvoiceDeductionsAsync(
            InvoiceStockDeductionRequestDto? request,
            bool reserveDeductionKeyWhenEmpty = false,
            CancellationToken cancellationToken = default);

        InvoiceStockDeductionRequestDto BuildRequestFromArchivePayload(
            string invoiceNumber,
            string customerName,
            string? itemsJson);

        bool IsUniqueInvoiceDeductionViolation(DbUpdateException exception);
    }
}
