using backend.DTOs;
using Microsoft.EntityFrameworkCore;

namespace backend.Services
{
    public class FiscalReceiptStockDeductionStageResult
    {
        public InvoiceStockDeductionResultDto Result { get; set; } = new();
        public string? ErrorMessage { get; set; }
        public bool HasPendingDeductions { get; set; }
    }

    public interface IFiscalReceiptStockDeductionService
    {
        Task<FiscalReceiptStockDeductionStageResult> StageFiscalReceiptDeductionsAsync(
            InvoiceStockDeductionRequestDto? request,
            bool reserveDeductionKeyWhenEmpty = false,
            CancellationToken cancellationToken = default);

        InvoiceStockDeductionRequestDto BuildRequestFromReceiptPayload(
            string receiptNumber,
            string? customerName,
            string? itemsJson);

        bool IsUniqueFiscalReceiptDeductionViolation(DbUpdateException exception);
    }
}
