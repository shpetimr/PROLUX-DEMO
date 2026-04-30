using Microsoft.AspNetCore.Mvc;
using backend.DTOs;
using backend.Authorization;
using backend.Services;
using Microsoft.AspNetCore.Authorization;

namespace backend.Controllers
{
    [ApiController]
    [Route("api/templates")]
    [Authorize(Policy = AppPermissions.TemplatesPrint)]
    public class TemplatesController : ControllerBase
    {
        [HttpPost("invoice/print")]
        public IActionResult PrintInvoice([FromBody] InvoiceTemplateDto dto)
        {
            var pdfService = new InvoiceTemplatePdfService();
            var pdfBytes = pdfService.GenerateBlankInvoicePdf();
            return File(pdfBytes, "application/pdf", "InvoiceTemplate.pdf");
        }
    }
} 
