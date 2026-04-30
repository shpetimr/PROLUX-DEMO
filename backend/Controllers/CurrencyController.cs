using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using backend.DTOs;
using backend.Models;

namespace backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class CurrencyController : ControllerBase
    {
        [HttpGet]
        public ActionResult<CurrencyInfoDto> GetCurrencyInfo()
        {
            var currencyInfo = new CurrencyInfoDto
            {
                CurrencyCode = CurrencyConfig.CurrencyCode,
                CurrencyName = CurrencyConfig.CurrencyName,
                CurrencySymbol = CurrencyConfig.CurrencySymbol,
                Locale = CurrencyConfig.Locale,
                Display = new CurrencyDisplayDto
                {
                    CurrencyFormat = CurrencyConfig.Display.CurrencyFormat,
                    CurrencyFormatWithSymbol = CurrencyConfig.Display.CurrencyFormatWithSymbol,
                    CurrencyFormatCompact = CurrencyConfig.Display.CurrencyFormatCompact
                },
                Conversion = new CurrencyConversionDto
                {
                    EurToMkdRate = CurrencyConfig.Conversion.EUR_TO_MKD_RATE,
                    UsdToMkdRate = CurrencyConfig.Conversion.USD_TO_MKD_RATE,
                    AllToMkdRate = CurrencyConfig.Conversion.ALL_TO_MKD_RATE
                }
            };

            return Ok(currencyInfo);
        }

        [HttpGet("format/{amount:decimal}")]
        public ActionResult<string> FormatAmount(decimal amount)
        {
            return Ok(string.Format(CurrencyConfig.Display.CurrencyFormat, amount));
        }

        [HttpGet("convert/eur/{amount:decimal}")]
        public ActionResult<decimal> ConvertEurToMkd(decimal amount)
        {
            return Ok(amount * CurrencyConfig.Conversion.EUR_TO_MKD_RATE);
        }

        [HttpGet("convert/usd/{amount:decimal}")]
        public ActionResult<decimal> ConvertUsdToMkd(decimal amount)
        {
            return Ok(amount * CurrencyConfig.Conversion.USD_TO_MKD_RATE);
        }

        [HttpGet("convert/lek/{amount:decimal}")]
        public ActionResult<decimal> ConvertLekToMkd(decimal amount)
        {
            return Ok(amount * CurrencyConfig.Conversion.ALL_TO_MKD_RATE);
        }
    }
} 
