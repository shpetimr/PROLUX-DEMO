using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using System.IO;

namespace backend.Services
{
    public class InvoiceTemplatePdfService
    {
        public byte[] GenerateBlankInvoicePdf()
        {
            var document = Document.Create(container =>
            {
                container.Page(page =>
                {
                    page.Size(PageSizes.A4);
                    page.Margin(30);
                    page.DefaultTextStyle(x => x.FontSize(10));

                    page.Header().Element(ComposeHeader);
                    page.Content().Element(ComposeContent);
                    page.Footer().Element(ComposeFooter);
                });
            });

            using var ms = new MemoryStream();
            document.GeneratePdf(ms);
            return ms.ToArray();
        }

        void ComposeHeader(IContainer container)
        {
            container.Row(row =>
            {
                row.RelativeItem().Column(col =>
                {
                    col.Item().Text("PROLUX GROUP").Bold().FontSize(22);
                    col.Item().Text("SUPERIOR NATURAL SURFACES").FontSize(12);
                });
                row.RelativeItem().AlignRight().Column(col =>
                {
                    col.Item().Text("PROLUX Group - Superior Natural Surfaces").FontSize(9);
                    col.Item().Text("Address: 11 Noemvri br.52").FontSize(9);
                    col.Item().Text("Email: proluxceramics01@gmail.com").FontSize(9);
                    col.Item().Text("Tel: 071/764/334").FontSize(9);
                });
            });
            container.PaddingVertical(10).LineHorizontal(1);
        }

        void ComposeContent(IContainer container)
        {
            container.Column(col =>
            {
                col.Item().PaddingBottom(10).Text(""); // Space for custom fields
                col.Item().Element(ComposeTable);
                col.Item().PaddingTop(10).Element(ComposeDescriptionBox);
            });
        }

        void ComposeTable(IContainer container)
        {
            container.Table(table =>
            {
                table.ColumnsDefinition(columns =>
                {
                    columns.ConstantColumn(40); // ITEM
                    columns.RelativeColumn(2); // Name
                    columns.RelativeColumn(2); // Materials
                    columns.ConstantColumn(60); // m2/pcs
                    columns.ConstantColumn(60); // Price
                    columns.ConstantColumn(60); // Total
                });

                table.Header(header =>
                {
                    header.Cell().Element(CellStyle).Text("ITEM").Bold();
                    header.Cell().Element(CellStyle).Text("Name").Bold();
                    header.Cell().Element(CellStyle).Text("Materials").Bold();
                    header.Cell().Element(CellStyle).Text("m2/pcs").Bold();
                    header.Cell().Element(CellStyle).Text("Price").Bold();
                    header.Cell().Element(CellStyle).Text("Total").Bold();
                });

                for (int i = 0; i < 8; i++)
                {
                    table.Cell().Element(CellStyle).Text("");
                    table.Cell().Element(CellStyle).Text("");
                    table.Cell().Element(CellStyle).Text("");
                    table.Cell().Element(CellStyle).Text("");
                    table.Cell().Element(CellStyle).Text("");
                    table.Cell().Element(CellStyle).Text("");
                }
            });

            static IContainer CellStyle(IContainer container)
            {
                return container.Border(1).Padding(2);
            }
        }

        void ComposeDescriptionBox(IContainer container)
        {
            container.Row(row =>
            {
                row.RelativeItem(3).Column(col =>
                {
                    col.Item().Background("#F5F5F5").Border(1).Padding(5).Column(innerCol =>
                    {
                        innerCol.Item().Text("Description").Italic().FontSize(10);
                        for (int i = 1; i <= 6; i++)
                        {
                            innerCol.Item().Text($"{i}").FontSize(9).FontColor("#888");
                        }
                    });
                });
                row.RelativeItem(2).AlignMiddle().AlignRight().Column(col =>
                {
                    col.Item().Text("TOTAL").Bold().FontSize(12);
                    col.Item().Text("").FontSize(12);
                });
            });
        }

        void ComposeFooter(IContainer container)
        {
            container.PaddingTop(10).Row(row =>
            {
                row.RelativeItem().Text("For any further information you can contact us:").Italic().FontSize(9);
            });
            container.Row(row =>
            {
                row.RelativeItem().Text("Email: proluxceramics01@gmail.com").FontSize(9);
                row.RelativeItem().AlignRight().Text("Tel: 071/764/334").FontSize(9);
            });
        }
    }
} 
