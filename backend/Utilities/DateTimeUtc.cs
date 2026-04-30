namespace backend.Utilities
{
    public static class DateTimeUtc
    {
        public static DateTime Normalize(DateTime value)
        {
            return value.Kind switch
            {
                DateTimeKind.Utc => value,
                DateTimeKind.Local => value.ToUniversalTime(),
                _ => DateTime.SpecifyKind(value, DateTimeKind.Utc)
            };
        }

        public static DateTime Date(DateTime value)
        {
            return Normalize(value).Date;
        }

        public static DateTime Today()
        {
            return DateTime.UtcNow.Date;
        }

        public static DateTime MonthStart(int year, int month)
        {
            return new DateTime(year, month, 1, 0, 0, 0, DateTimeKind.Utc);
        }

        public static DateTime YearStart(int year)
        {
            return new DateTime(year, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        }
    }
}
