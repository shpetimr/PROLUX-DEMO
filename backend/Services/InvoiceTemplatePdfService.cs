using System.IO;
using System.Globalization;
using System.Text.Json;
using backend.Models;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

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

        public byte[] GenerateArchivedInvoicePdf(InvoiceArchive invoice)
        {
            var labels = InvoiceArchivePdfLabels.For(invoice.Language);
            var snapshot = ParseArchivedInvoiceSnapshot(invoice.ItemsJson);

            var document = Document.Create(container =>
            {
                container.Page(page =>
                {
                    page.Size(PageSizes.A4);
                    page.Margin(30);
                    page.DefaultTextStyle(x => x.FontFamily("Lato").FontSize(10));

                    page.Header().Element(ComposeHeader);
                    page.Content().Element(content => ComposeArchivedInvoiceContent(content, invoice, snapshot, labels));
                    page.Footer().Element(footer => ComposeFooter(footer, labels.ContactLine));
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

        void ComposeArchivedInvoiceContent(
            IContainer container,
            InvoiceArchive invoice,
            ArchivedInvoiceSnapshot snapshot,
            InvoiceArchivePdfLabels labels)
        {
            container.PaddingTop(16).Column(col =>
            {
                col.Item().AlignCenter().Text(labels.Title).Bold().FontSize(18);
                col.Item().PaddingTop(12).Row(row =>
                {
                    row.RelativeItem().Column(customer =>
                    {
                        customer.Item().Text(labels.Customer).Bold();
                        customer.Item().Text(invoice.CustomerName);

                        if (!string.IsNullOrWhiteSpace(invoice.CustomerAddress))
                        {
                            customer.Item().PaddingTop(3).Text($"{labels.Address}: {invoice.CustomerAddress}");
                        }

                        if (!string.IsNullOrWhiteSpace(invoice.CustomerPhone))
                        {
                            customer.Item().PaddingTop(3).Text($"{labels.Phone}: {invoice.CustomerPhone}");
                        }
                    });

                    row.ConstantItem(190).AlignRight().Column(metadata =>
                    {
                        metadata.Item().Text($"{labels.InvoiceNumber}: {invoice.InvoiceNumber}").Bold();
                        metadata.Item().PaddingTop(3).Text($"{labels.Date}: {snapshot.InvoiceDate ?? FormatArchiveDate(invoice.CreatedAt)}");
                        metadata.Item().PaddingTop(3).Text($"{labels.ArchivedAt}: {FormatArchiveDate(invoice.CreatedAt)}");
                        metadata.Item().PaddingTop(3).Text($"{labels.ArchivedBy}: {invoice.CreatedBy.FullName}");
                    });
                });

                col.Item().PaddingTop(16).Element(table => ComposeArchivedItemsTable(table, snapshot.Items, labels));
                col.Item().PaddingTop(14).Row(row =>
                {
                    row.RelativeItem().Element(notes => ComposeArchivedNotes(notes, invoice, snapshot, labels));
                    row.ConstantItem(220).Element(totals => ComposeArchivedTotals(totals, invoice, snapshot, labels));
                });
            });
        }

        void ComposeArchivedItemsTable(
            IContainer container,
            IReadOnlyList<ArchivedInvoiceItem> items,
            InvoiceArchivePdfLabels labels)
        {
            var displayItems = items.Count > 0
                ? items
                : new[] { new ArchivedInvoiceItem("", "", "", "", "", "") };

            container.Table(table =>
            {
                table.ColumnsDefinition(columns =>
                {
                    columns.ConstantColumn(38);
                    columns.RelativeColumn(2);
                    columns.RelativeColumn(2);
                    columns.ConstantColumn(64);
                    columns.ConstantColumn(68);
                    columns.ConstantColumn(72);
                });

                table.Header(header =>
                {
                    header.Cell().Element(ArchivedHeaderCellStyle).Text(labels.Item).Bold();
                    header.Cell().Element(ArchivedHeaderCellStyle).Text(labels.Name).Bold();
                    header.Cell().Element(ArchivedHeaderCellStyle).Text(labels.Materials).Bold();
                    header.Cell().Element(ArchivedHeaderCellStyle).Text(labels.Quantity).Bold();
                    header.Cell().Element(ArchivedHeaderCellStyle).Text(labels.Price).Bold();
                    header.Cell().Element(ArchivedHeaderCellStyle).Text(labels.LineTotal).Bold();
                });

                for (var index = 0; index < displayItems.Count; index++)
                {
                    var item = displayItems[index];
                    table.Cell().Element(ArchivedBodyCellStyle).Text(string.IsNullOrWhiteSpace(item.Item) ? (index + 1).ToString() : item.Item);
                    table.Cell().Element(ArchivedBodyCellStyle).Text(item.Name);
                    table.Cell().Element(ArchivedBodyCellStyle).Text(item.Materials);
                    table.Cell().Element(ArchivedBodyCellStyle).Text(item.Quantity);
                    table.Cell().Element(ArchivedBodyCellStyle).Text(item.Price);
                    table.Cell().Element(ArchivedBodyCellStyle).Text(item.Total);
                }
            });

            static IContainer ArchivedHeaderCellStyle(IContainer container)
            {
                return container.Border(1).BorderColor("#333333").Background("#EEEEEE").Padding(4);
            }

            static IContainer ArchivedBodyCellStyle(IContainer container)
            {
                return container.Border(1).BorderColor("#999999").MinHeight(22).Padding(4);
            }
        }

        void ComposeArchivedNotes(
            IContainer container,
            InvoiceArchive invoice,
            ArchivedInvoiceSnapshot snapshot,
            InvoiceArchivePdfLabels labels)
        {
            container.PaddingRight(14).Column(col =>
            {
                col.Item().Text(labels.Notes).Bold();

                var hasNotes = false;
                if (!string.IsNullOrWhiteSpace(invoice.Notes))
                {
                    hasNotes = true;
                    col.Item().PaddingTop(4).Text(invoice.Notes);
                }

                foreach (var line in snapshot.DescriptionLines.Where(line => !string.IsNullOrWhiteSpace(line)))
                {
                    hasNotes = true;
                    col.Item().PaddingTop(3).Text(line);
                }

                if (!hasNotes)
                {
                    col.Item().PaddingTop(4).Text("-");
                }
            });
        }

        void ComposeArchivedTotals(
            IContainer container,
            InvoiceArchive invoice,
            ArchivedInvoiceSnapshot snapshot,
            InvoiceArchivePdfLabels labels)
        {
            var totals = snapshot.Totals;
            var lineSubtotal = totals?.LineSubtotal ?? invoice.Subtotal;
            var discountPercent = totals?.DiscountPercent ?? 0;
            var discountAmount = totals?.DiscountAmount ?? 0;
            var totalAfterDiscount = totals?.TotalAfterDiscount;
            var advance = totals?.Advance ?? 0;
            var balanceDue = totals?.BalanceDue ?? invoice.Total;
            var hasDiscount = discountPercent > 0 || discountAmount > 0;
            var hasAdvance = advance > 0;
            var hasBreakdown = hasDiscount || hasAdvance || totalAfterDiscount.HasValue;

            container.BorderTop(1).BorderColor("#CCCCCC").PaddingTop(8).Column(col =>
            {
                var isFirstRow = true;

                void AddRow(string label, string amount, bool bold = false, int fontSize = 10)
                {
                    var item = isFirstRow ? col.Item() : col.Item().PaddingTop(6);
                    isFirstRow = false;

                    item.Row(row =>
                    {
                        if (bold)
                        {
                            row.RelativeItem().Text(label).Bold();
                            row.ConstantItem(90).AlignRight().Text(amount).Bold().FontSize(fontSize);
                            return;
                        }

                        row.RelativeItem().Text(label);
                        row.ConstantItem(90).AlignRight().Text(amount).Bold().FontSize(fontSize);
                    });
                }

                AddRow(labels.Subtotal, FormatMoney(lineSubtotal));

                if (hasDiscount)
                {
                    AddRow($"{labels.Discount} ({discountPercent:0.##}%)", $"- {FormatMoney(discountAmount)}");
                }

                if (totalAfterDiscount.HasValue && hasBreakdown)
                {
                    AddRow(labels.TotalAfterDiscount, FormatMoney(totalAfterDiscount.Value));
                }

                if (hasAdvance)
                {
                    AddRow(labels.Advance, $"- {FormatMoney(advance)}");
                }

                AddRow(hasBreakdown ? labels.BalanceDue : labels.Total, FormatMoney(balanceDue), true, 12);
            });
        }

        void ComposeFooter(IContainer container)
        {
            ComposeFooter(container, "For any further information you can contact us:");
        }

        void ComposeFooter(IContainer container, string contactLine)
        {
            container.PaddingTop(10).Row(row =>
            {
                row.RelativeItem().Text(contactLine).Italic().FontSize(9);
            });
            container.Row(row =>
            {
                row.RelativeItem().Text("Email: proluxceramics01@gmail.com").FontSize(9);
                row.RelativeItem().AlignRight().Text("Tel: 071/764/334").FontSize(9);
            });
        }

        static ArchivedInvoiceSnapshot ParseArchivedInvoiceSnapshot(string itemsJson)
        {
            try
            {
                using var document = JsonDocument.Parse(itemsJson);
                var root = document.RootElement;
                var invoiceDate = TryReadPropertyAsText(root, "date")
                    ?? TryReadPropertyAsText(root, "invoiceDate");
                var descriptionLines = ReadDescriptionLines(root);
                var totals = ReadArchivedTotals(root);

                var itemRoot = root.ValueKind == JsonValueKind.Array
                    ? root
                    : TryGetProperty(root, "items")
                        ?? TryGetProperty(root, "rows")
                        ?? TryGetProperty(root, "lines");

                if (itemRoot is not { ValueKind: JsonValueKind.Array } itemsElement)
                {
                    return new ArchivedInvoiceSnapshot(Array.Empty<ArchivedInvoiceItem>(), invoiceDate, descriptionLines, totals);
                }

                var items = itemsElement.EnumerateArray()
                    .Where(item => item.ValueKind == JsonValueKind.Object)
                    .Select((item, index) => new ArchivedInvoiceItem(
                        TryReadPropertyAsText(item, "item")
                            ?? TryReadPropertyAsText(item, "itemNumber")
                            ?? TryReadPropertyAsText(item, "number")
                            ?? (index + 1).ToString(),
                        TryReadPropertyAsText(item, "name")
                            ?? TryReadPropertyAsText(item, "itemName")
                            ?? TryReadPropertyAsText(item, "description")
                            ?? string.Empty,
                        TryReadPropertyAsText(item, "materials")
                            ?? TryReadPropertyAsText(item, "material")
                            ?? string.Empty,
                        TryReadPropertyAsText(item, "m2pcs")
                            ?? TryReadPropertyAsText(item, "m2Pcs")
                            ?? TryReadPropertyAsText(item, "quantity")
                            ?? TryReadPropertyAsText(item, "qty")
                            ?? TryReadPropertyAsText(item, "unit")
                            ?? string.Empty,
                        TryReadPropertyAsText(item, "price")
                            ?? TryReadPropertyAsText(item, "unitPrice")
                            ?? string.Empty,
                        TryReadPropertyAsText(item, "total")
                            ?? TryReadPropertyAsText(item, "lineTotal")
                            ?? string.Empty))
                    .ToList();

                return new ArchivedInvoiceSnapshot(items, invoiceDate, descriptionLines, totals);
            }
            catch (JsonException)
            {
                return new ArchivedInvoiceSnapshot(Array.Empty<ArchivedInvoiceItem>(), null, Array.Empty<string>(), null);
            }
        }

        static ArchivedInvoiceTotals? ReadArchivedTotals(JsonElement root)
        {
            if (root.ValueKind != JsonValueKind.Object)
            {
                return null;
            }

            var totals = TryGetProperty(root, "totals");
            if (totals is not { ValueKind: JsonValueKind.Object } totalsElement)
            {
                return null;
            }

            return new ArchivedInvoiceTotals(
                TryReadPropertyAsDecimal(totalsElement, "lineSubtotal"),
                TryReadPropertyAsDecimal(totalsElement, "discountPercent"),
                TryReadPropertyAsDecimal(totalsElement, "discountAmount"),
                TryReadPropertyAsDecimal(totalsElement, "totalAfterDiscount"),
                TryReadPropertyAsDecimal(totalsElement, "advance"),
                TryReadPropertyAsDecimal(totalsElement, "balanceDue"));
        }

        static IReadOnlyList<string> ReadDescriptionLines(JsonElement root)
        {
            if (root.ValueKind != JsonValueKind.Object)
            {
                return Array.Empty<string>();
            }

            var description = TryGetProperty(root, "description")
                ?? TryGetProperty(root, "descriptions")
                ?? TryGetProperty(root, "notes");

            if (description is not { } value)
            {
                return Array.Empty<string>();
            }

            if (value.ValueKind == JsonValueKind.Array)
            {
                return value.EnumerateArray()
                    .Select(ReadElementText)
                    .Where(text => !string.IsNullOrWhiteSpace(text))
                    .Select(text => text!)
                    .ToList();
            }

            var line = ReadElementText(value);
            return string.IsNullOrWhiteSpace(line)
                ? Array.Empty<string>()
                : new[] { line };
        }

        static JsonElement? TryGetProperty(JsonElement element, string propertyName)
        {
            if (element.ValueKind != JsonValueKind.Object)
            {
                return null;
            }

            foreach (var property in element.EnumerateObject())
            {
                if (string.Equals(property.Name, propertyName, StringComparison.OrdinalIgnoreCase))
                {
                    return property.Value;
                }
            }

            return null;
        }

        static string? TryReadPropertyAsText(JsonElement element, string propertyName)
        {
            var property = TryGetProperty(element, propertyName);
            return property.HasValue ? ReadElementText(property.Value) : null;
        }

        static decimal? TryReadPropertyAsDecimal(JsonElement element, string propertyName)
        {
            var property = TryGetProperty(element, propertyName);
            return property.HasValue ? ReadElementDecimal(property.Value) : null;
        }

        static string? ReadElementText(JsonElement element)
        {
            return element.ValueKind switch
            {
                JsonValueKind.String => element.GetString()?.Trim(),
                JsonValueKind.Number => element.GetRawText(),
                JsonValueKind.True => "true",
                JsonValueKind.False => "false",
                _ => null
            };
        }

        static decimal? ReadElementDecimal(JsonElement element)
        {
            if (element.ValueKind == JsonValueKind.Number && element.TryGetDecimal(out var numericValue))
            {
                return numericValue;
            }

            if (element.ValueKind != JsonValueKind.String)
            {
                return null;
            }

            var normalized = element.GetString()?.Trim().Replace(',', '.');
            return decimal.TryParse(
                normalized,
                NumberStyles.Number,
                CultureInfo.InvariantCulture,
                out var stringValue)
                ? stringValue
                : null;
        }

        static string FormatArchiveDate(DateTime value)
        {
            return value.ToString("dd.MM.yyyy");
        }

        static string FormatMoney(decimal value)
        {
            return $"{value:0.00} MKD";
        }

        sealed record ArchivedInvoiceSnapshot(
            IReadOnlyList<ArchivedInvoiceItem> Items,
            string? InvoiceDate,
            IReadOnlyList<string> DescriptionLines,
            ArchivedInvoiceTotals? Totals);

        sealed record ArchivedInvoiceItem(
            string Item,
            string Name,
            string Materials,
            string Quantity,
            string Price,
            string Total);

        sealed record ArchivedInvoiceTotals(
            decimal? LineSubtotal,
            decimal? DiscountPercent,
            decimal? DiscountAmount,
            decimal? TotalAfterDiscount,
            decimal? Advance,
            decimal? BalanceDue);

        sealed record InvoiceArchivePdfLabels(
            string Title,
            string Customer,
            string Address,
            string Phone,
            string InvoiceNumber,
            string Date,
            string ArchivedAt,
            string ArchivedBy,
            string Item,
            string Name,
            string Materials,
            string Quantity,
            string Price,
            string LineTotal,
            string Notes,
            string Subtotal,
            string Discount,
            string TotalAfterDiscount,
            string Advance,
            string BalanceDue,
            string Total,
            string ContactLine)
        {
            public static InvoiceArchivePdfLabels For(InvoiceLanguage language)
            {
                return language == InvoiceLanguage.Macedonian
                    ? new InvoiceArchivePdfLabels(
                        "\u0424\u0410\u041A\u0422\u0423\u0420\u0410",
                        "\u041A\u043B\u0438\u0435\u043D\u0442",
                        "\u0410\u0434\u0440\u0435\u0441\u0430",
                        "\u0422\u0435\u043B\u0435\u0444\u043E\u043D",
                        "\u0411\u0440. \u0444\u0430\u043A\u0442\u0443\u0440\u0430",
                        "\u0414\u0430\u0442\u0443\u043C",
                        "\u0410\u0440\u0445\u0438\u0432\u0438\u0440\u0430\u043D\u043E",
                        "\u0410\u0440\u0445\u0438\u0432\u0438\u0440\u0430\u043B",
                        "\u0420.\u0411.",
                        "\u0418\u043C\u0435",
                        "\u041C\u0430\u0442\u0435\u0440\u0438\u0458\u0430\u043B\u0438",
                        "m2/\u043F\u0430\u0440\u0447\u0438\u045A\u0430",
                        "\u0426\u0435\u043D\u0430",
                        "\u0412\u043A\u0443\u043F\u043D\u043E",
                        "\u0417\u0430\u0431\u0435\u043B\u0435\u0448\u043A\u0438",
                        "\u041C\u0435\u0453\u0443\u0437\u0431\u0438\u0440",
                        "\u041F\u043E\u043F\u0443\u0441\u0442",
                        "\u0412\u043A\u0443\u043F\u043D\u043E \u043F\u043E \u043F\u043E\u043F\u0443\u0441\u0442",
                        "\u0410\u0432\u0430\u043D\u0441",
                        "\u0417\u0430 \u043F\u043B\u0430\u045C\u0430\u045A\u0435",
                        "\u0412\u043A\u0443\u043F\u043D\u043E",
                        "\u0417\u0430 \u043F\u043E\u0432\u0435\u045C\u0435 \u0438\u043D\u0444\u043E\u0440\u043C\u0430\u0446\u0438\u0438 \u043A\u043E\u043D\u0442\u0430\u043A\u0442\u0438\u0440\u0430\u0458\u0442\u0435 \u043D\u0435:")
                    : new InvoiceArchivePdfLabels(
                        "FATUR\u00CB",
                        "Klienti",
                        "Adresa",
                        "Telefoni",
                        "Nr. fatur\u00EBs",
                        "Data",
                        "Arkivuar m\u00EB",
                        "Arkivuar nga",
                        "Nr.",
                        "Emri",
                        "Materialet",
                        "m2/cop\u00EB",
                        "\u00C7mimi",
                        "Totali",
                        "Sh\u00EBnime",
                        "N\u00EBntotali",
                        "Zbritja",
                        "Total pas zbritjes",
                        "Avans",
                        "P\u00EBr t\u00EB paguar",
                        "Totali",
                        "P\u00EBr \u00E7do informacion shtes\u00EB mund t\u00EB na kontaktoni:");
            }
        }
    }
} 
