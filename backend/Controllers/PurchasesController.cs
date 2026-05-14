using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using backend.Authorization;
using backend.Data;
using backend.Models;
using backend.DTOs;
using backend.Services;
using backend.Utilities;

namespace backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Policy = AppPermissions.PurchasesManage)]
    public class PurchasesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public PurchasesController(ApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        [HttpGet]
        [Authorize]
        public async Task<ActionResult<IEnumerable<PurchaseResponseDto>>> GetPurchases()
        {
            // Admin can see all purchases, users can only see their own
            IQueryable<Purchase> purchasesQuery = _context.Purchases;
            
            if (!_currentUserService.IsAdmin())
            {
                // Regular users can only see purchases they created
                purchasesQuery = purchasesQuery.Where(p => p.CreatedById == _currentUserService.GetCurrentUserId());
            }
            
            var purchases = await purchasesQuery
                .OrderByDescending(p => p.PurchaseDate)
                .ToListAsync();

            var response = purchases.Select(p => new PurchaseResponseDto
            {
                Id = p.Id,
                ItemName = p.ItemName,
                Quantity = p.Quantity,
                UnitPrice = p.UnitPrice,
                TotalPrice = p.TotalPrice,
                PurchaseDate = p.PurchaseDate,
                Description = p.Description,
                CreatedAt = p.CreatedAt,
                UpdatedAt = p.UpdatedAt,
                currencyCode = "MKD",
                currencySymbol = "MKD"
            });

            return Ok(response);
        }

        [HttpGet("{id}")]
        [Authorize]
        public async Task<ActionResult<PurchaseResponseDto>> GetPurchase(int id)
        {
            var purchase = await _context.Purchases.FindAsync(id);

            if (purchase == null)
            {
                return NotFound();
            }

            // Check if user has access to this purchase
            if (!_currentUserService.IsAdmin() && purchase.CreatedById != _currentUserService.GetCurrentUserId())
            {
                return Forbid();
            }

            var response = new PurchaseResponseDto
            {
                Id = purchase.Id,
                ItemName = purchase.ItemName,
                Quantity = purchase.Quantity,
                UnitPrice = purchase.UnitPrice,
                TotalPrice = purchase.TotalPrice,
                PurchaseDate = purchase.PurchaseDate,
                Description = purchase.Description,
                CreatedAt = purchase.CreatedAt,
                UpdatedAt = purchase.UpdatedAt,
                currencyCode = "MKD",
                currencySymbol = "MKD"
            };

            return Ok(response);
        }

        [HttpPost]
        [Authorize]
        public async Task<ActionResult<PurchaseResponseDto>> CreatePurchase(CreatePurchaseDto createDto)
        {
            // Parse the date string to DateTime
            if (!DateTime.TryParse(createDto.PurchaseDate, out DateTime purchaseDate))
            {
                return BadRequest("Invalid date format. Expected YYYY-MM-DD");
            }
            purchaseDate = DateTimeUtc.Date(purchaseDate);
            
            var totalPrice = createDto.Quantity * createDto.UnitPrice;

            var purchase = new Purchase
            {
                ItemName = createDto.ItemName,
                Quantity = createDto.Quantity,
                UnitPrice = createDto.UnitPrice,
                TotalPrice = totalPrice,
                PurchaseDate = purchaseDate,
                Description = createDto.Description,
                CreatedAt = DateTime.UtcNow,
                CreatedById = _currentUserService.GetCurrentUserId()
            };

            _context.Purchases.Add(purchase);
            await _context.SaveChangesAsync();

            var response = new PurchaseResponseDto
            {
                Id = purchase.Id,
                ItemName = purchase.ItemName,
                Quantity = purchase.Quantity,
                UnitPrice = purchase.UnitPrice,
                TotalPrice = purchase.TotalPrice,
                PurchaseDate = purchase.PurchaseDate,
                Description = purchase.Description,
                CreatedAt = purchase.CreatedAt,
                UpdatedAt = purchase.UpdatedAt,
                currencyCode = "MKD",
                currencySymbol = "MKD"
            };

            return CreatedAtAction(nameof(GetPurchase), new { id = purchase.Id }, response);
        }

        [HttpPut("{id}")]
        [Authorize]
        public async Task<IActionResult> UpdatePurchase(int id, UpdatePurchaseDto updateDto)
        {
            var purchase = await _context.Purchases.FindAsync(id);

            if (purchase == null)
            {
                return NotFound();
            }

            // Check if user has access to this purchase
            if (!_currentUserService.IsAdmin() && purchase.CreatedById != _currentUserService.GetCurrentUserId())
            {
                return Forbid();
            }

            if (updateDto.ItemName != null)
                purchase.ItemName = updateDto.ItemName;

            if (updateDto.Quantity.HasValue)
                purchase.Quantity = updateDto.Quantity.Value;

            if (updateDto.UnitPrice.HasValue)
                purchase.UnitPrice = updateDto.UnitPrice.Value;

            // Recalculate total price if quantity or unit price changed
            if (updateDto.Quantity.HasValue || updateDto.UnitPrice.HasValue)
            {
                purchase.TotalPrice = purchase.Quantity * purchase.UnitPrice;
            }

            if (updateDto.Description != null)
                purchase.Description = updateDto.Description;

            if (!string.IsNullOrEmpty(updateDto.PurchaseDate))
            {
                // Parse the date string to DateTime
                if (DateTime.TryParse(updateDto.PurchaseDate, out DateTime newPurchaseDate))
                {
                    purchase.PurchaseDate = DateTimeUtc.Date(newPurchaseDate);
                }
                else
                {
                    return BadRequest("Invalid date format. Expected YYYY-MM-DD");
                }
            }

            purchase.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return NoContent();
        }

        [HttpDelete("{id}")]
        [Authorize]
        public async Task<IActionResult> DeletePurchase(int id)
        {
            var purchase = await _context.Purchases.FindAsync(id);
            if (purchase == null)
            {
                return NotFound();
            }

            // Check if user has access to this purchase
            if (!_currentUserService.IsAdmin() && purchase.CreatedById != _currentUserService.GetCurrentUserId())
            {
                return Forbid();
            }

            _context.Purchases.Remove(purchase);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        [HttpGet("summary")]
        public async Task<ActionResult<object>> GetPurchaseSummary()
        {
            var purchasesQuery = GetAccessiblePurchases();
            var totalPurchases = await purchasesQuery.SumAsync(p => p.TotalPrice);
            var purchaseCount = await purchasesQuery.CountAsync();
            var averagePurchase = purchaseCount > 0 ? totalPurchases / purchaseCount : 0;

            var summaryByItem = await purchasesQuery
                .GroupBy(p => p.ItemName)
                .Select(g => new
                {
                    ItemName = g.Key,
                    TotalSpent = g.Sum(p => p.TotalPrice),
                    TotalQuantity = g.Sum(p => p.Quantity),
                    PurchaseCount = g.Count()
                })
                .OrderByDescending(x => x.TotalSpent)
                .ToListAsync();

            return Ok(new
            {
                TotalPurchases = totalPurchases,
                PurchaseCount = purchaseCount,
                AveragePurchase = averagePurchase,
                SummaryByItem = summaryByItem
            });
        }

        [HttpGet("items")]
        public async Task<ActionResult<IEnumerable<string>>> GetItemNames()
        {
            var items = await GetAccessiblePurchases()
                .Select(p => p.ItemName)
                .Distinct()
                .OrderBy(i => i)
                .ToListAsync();

            return Ok(items);
        }

        private IQueryable<Purchase> GetAccessiblePurchases()
        {
            IQueryable<Purchase> purchasesQuery = _context.Purchases;

            if (!_currentUserService.IsAdmin())
            {
                var currentUserId = _currentUserService.GetCurrentUserId();
                purchasesQuery = purchasesQuery.Where(p => p.CreatedById == currentUserId);
            }

            return purchasesQuery;
        }
    }
} 
