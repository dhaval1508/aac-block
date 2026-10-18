/**
 * Global Date Utilities for Swarnim AAC Block ERP
 * Timezone: Asia/Kolkata (IST = UTC+05:30)
 * Handles factory-local presets, boundary calculations, and query-param sync.
 */

export type DatePresetKey =
  | "today"
  | "yesterday"
  | "this_week"
  | "last_week"
  | "last_7_days"
  | "last_30_days"
  | "this_month"
  | "last_month"
  | "last_3_months"
  | "this_year"
  | "all_time"
  | "custom";

export interface DatePresetOption {
  key: DatePresetKey;
  label: string;
  shortLabel: string;
}

export const DATE_PRESETS: DatePresetOption[] = [
  { key: "today", label: "Today", shortLabel: "Today" },
  { key: "yesterday", label: "Yesterday", shortLabel: "Yesterday" },
  { key: "this_week", label: "This Week", shortLabel: "This Wk" },
  { key: "last_week", label: "Last Week", shortLabel: "Last Wk" },
  { key: "last_7_days", label: "Last 7 Days", shortLabel: "7 Days" },
  { key: "last_30_days", label: "Last 30 Days", shortLabel: "30 Days" },
  { key: "this_month", label: "This Month", shortLabel: "This Mo" },
  { key: "last_month", label: "Last Month", shortLabel: "Last Mo" },
  { key: "last_3_months", label: "Last 3 Months", shortLabel: "3 Mos" },
  { key: "this_year", label: "This Year", shortLabel: "This Yr" },
  { key: "all_time", label: "All Time", shortLabel: "All Time" },
  { key: "custom", label: "Custom Date Range", shortLabel: "Custom" },
];

export interface ResolvedDateRange {
  preset: DatePresetKey;
  startDate: Date | null;
  endDate: Date | null;
  label: string;
  fromParam: string; // YYYY-MM-DD
  toParam: string; // YYYY-MM-DD
}

/**
 * Returns current date/time parts in Asia/Kolkata (IST = UTC+5:30)
 */
function getISTDateParts(d: Date = new Date()) {
  const istOffsetMinutes = 330;
  const currentOffsetMinutes = d.getTimezoneOffset(); // negative for east of UTC
  const istMs = d.getTime() + (istOffsetMinutes + currentOffsetMinutes) * 60000;
  const ist = new Date(istMs);

  return {
    year: ist.getFullYear(),
    month: ist.getMonth(), // 0 - 11
    date: ist.getDate(), // 1 - 31
    day: ist.getDay(), // 0 = Sun, 1 = Mon ...
  };
}

/**
 * Converts IST Y-M-D to start of day in UTC (00:00:00.000+05:30)
 */
function createISTStart(year: number, month: number, date: number): Date {
  const mm = String(month + 1).padStart(2, "0");
  const dd = String(date).padStart(2, "0");
  return new Date(`${year}-${mm}-${dd}T00:00:00.000+05:30`);
}

/**
 * Converts IST Y-M-D to end of day in UTC (23:59:59.999+05:30)
 */
function createISTEnd(year: number, month: number, date: number): Date {
  const mm = String(month + 1).padStart(2, "0");
  const dd = String(date).padStart(2, "0");
  return new Date(`${year}-${mm}-${dd}T23:59:59.999+05:30`);
}

/**
 * Formats a date as YYYY-MM-DD in IST
 */
export function formatISTDate(d: Date): string {
  const { year, month, date } = getISTDateParts(d);
  const mm = String(month + 1).padStart(2, "0");
  const dd = String(date).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

/**
 * Formats a date for UI display: "13 Oct 2026"
 */
export function formatDisplayDate(d: Date | string | null): string {
  if (!d) return "—";
  const dateObj = typeof d === "string" ? new Date(d) : d;
  if (isNaN(dateObj.getTime())) return "—";

  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(dateObj);
}

/**
 * Resolves Date Range based on preset key or custom from/to params
 */
export function resolveDateRange(
  presetKey?: string | null,
  customFrom?: string | null,
  customTo?: string | null,
  now: Date = new Date()
): ResolvedDateRange {
  const { year, month, date, day } = getISTDateParts(now);

  const key: DatePresetKey = (presetKey as DatePresetKey) || (customFrom && customTo ? "custom" : "this_month");

  let startDate: Date | null = null;
  let endDate: Date | null = null;
  let label = "This Month";
  let fromParam = "";
  let toParam = "";

  switch (key) {
    case "today": {
      startDate = createISTStart(year, month, date);
      endDate = createISTEnd(year, month, date);
      label = `Today (${formatDisplayDate(startDate)})`;
      fromParam = formatISTDate(startDate);
      toParam = formatISTDate(endDate);
      break;
    }

    case "yesterday": {
      const yDate = new Date(createISTStart(year, month, date).getTime() - 86400000);
      const yParts = getISTDateParts(yDate);
      startDate = createISTStart(yParts.year, yParts.month, yParts.date);
      endDate = createISTEnd(yParts.year, yParts.month, yParts.date);
      label = `Yesterday (${formatDisplayDate(startDate)})`;
      fromParam = formatISTDate(startDate);
      toParam = formatISTDate(endDate);
      break;
    }

    case "this_week": {
      // Week starts Monday in factory ops. (day: 0=Sun, 1=Mon, ..., 6=Sat)
      const diffToMonday = day === 0 ? 6 : day - 1;
      const monDate = new Date(createISTStart(year, month, date).getTime() - diffToMonday * 86400000);
      const monParts = getISTDateParts(monDate);
      startDate = createISTStart(monParts.year, monParts.month, monParts.date);
      endDate = createISTEnd(year, month, date);
      label = `This Week (${formatDisplayDate(startDate)} – ${formatDisplayDate(endDate)})`;
      fromParam = formatISTDate(startDate);
      toParam = formatISTDate(endDate);
      break;
    }

    case "last_week": {
      const diffToMonday = day === 0 ? 6 : day - 1;
      const lastMonDate = new Date(
        createISTStart(year, month, date).getTime() - (diffToMonday + 7) * 86400000
      );
      const lastSunDate = new Date(lastMonDate.getTime() + 6 * 86400000);
      const monParts = getISTDateParts(lastMonDate);
      const sunParts = getISTDateParts(lastSunDate);
      startDate = createISTStart(monParts.year, monParts.month, monParts.date);
      endDate = createISTEnd(sunParts.year, sunParts.month, sunParts.date);
      label = `Last Week (${formatDisplayDate(startDate)} – ${formatDisplayDate(endDate)})`;
      fromParam = formatISTDate(startDate);
      toParam = formatISTDate(endDate);
      break;
    }

    case "last_7_days": {
      const start7 = new Date(createISTStart(year, month, date).getTime() - 6 * 86400000);
      const sParts = getISTDateParts(start7);
      startDate = createISTStart(sParts.year, sParts.month, sParts.date);
      endDate = createISTEnd(year, month, date);
      label = `Last 7 Days (${formatDisplayDate(startDate)} – ${formatDisplayDate(endDate)})`;
      fromParam = formatISTDate(startDate);
      toParam = formatISTDate(endDate);
      break;
    }

    case "last_30_days": {
      const start30 = new Date(createISTStart(year, month, date).getTime() - 29 * 86400000);
      const sParts = getISTDateParts(start30);
      startDate = createISTStart(sParts.year, sParts.month, sParts.date);
      endDate = createISTEnd(year, month, date);
      label = `Last 30 Days (${formatDisplayDate(startDate)} – ${formatDisplayDate(endDate)})`;
      fromParam = formatISTDate(startDate);
      toParam = formatISTDate(endDate);
      break;
    }

    case "this_month": {
      startDate = createISTStart(year, month, 1);
      // Last day of current month
      const nextMonthFirst = new Date(year, month + 1, 1);
      const lastDate = new Date(nextMonthFirst.getTime() - 86400000).getDate();
      endDate = createISTEnd(year, month, lastDate);
      label = `This Month (${new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", month: "long", year: "numeric" }).format(startDate)})`;
      fromParam = formatISTDate(startDate);
      toParam = formatISTDate(endDate);
      break;
    }

    case "last_month": {
      const prevMonthYear = month === 0 ? year - 1 : year;
      const prevMonth = month === 0 ? 11 : month - 1;
      const prevFirst = createISTStart(prevMonthYear, prevMonth, 1);
      const currentMonthFirst = new Date(year, month, 1);
      const lastDate = new Date(currentMonthFirst.getTime() - 86400000).getDate();
      startDate = prevFirst;
      endDate = createISTEnd(prevMonthYear, prevMonth, lastDate);
      label = `Last Month (${new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", month: "long", year: "numeric" }).format(startDate)})`;
      fromParam = formatISTDate(startDate);
      toParam = formatISTDate(endDate);
      break;
    }

    case "last_3_months": {
      const pastMonthDate = new Date(year, month - 2, 1);
      const pastParts = getISTDateParts(pastMonthDate);
      startDate = createISTStart(pastParts.year, pastParts.month, 1);
      endDate = createISTEnd(year, month, date);
      label = `Last 3 Months (${formatDisplayDate(startDate)} – ${formatDisplayDate(endDate)})`;
      fromParam = formatISTDate(startDate);
      toParam = formatISTDate(endDate);
      break;
    }

    case "this_year": {
      startDate = createISTStart(year, 0, 1);
      endDate = createISTEnd(year, 11, 31);
      label = `This Year (${year})`;
      fromParam = formatISTDate(startDate);
      toParam = formatISTDate(endDate);
      break;
    }

    case "custom": {
      if (customFrom && customTo) {
        const fromParts = customFrom.split("-").map(Number);
        const toParts = customTo.split("-").map(Number);
        if (fromParts.length === 3 && toParts.length === 3) {
          startDate = createISTStart(fromParts[0], fromParts[1] - 1, fromParts[2]);
          endDate = createISTEnd(toParts[0], toParts[1] - 1, toParts[2]);
          label = `Custom (${formatDisplayDate(startDate)} – ${formatDisplayDate(endDate)})`;
          fromParam = customFrom;
          toParam = customTo;
        } else {
          startDate = null;
          endDate = null;
          label = "All Time";
        }
      } else {
        startDate = null;
        endDate = null;
        label = "All Time";
      }
      break;
    }

    case "all_time":
    default: {
      startDate = null;
      endDate = null;
      label = "All Time";
      fromParam = "";
      toParam = "";
      break;
    }
  }

  return {
    preset: key,
    startDate,
    endDate,
    label,
    fromParam,
    toParam,
  };
}

/**
 * Builds Prisma where filter for timestamp field
 */
export function buildPrismaDateFilter(
  dateRange: ResolvedDateRange
): { gte?: Date; lte?: Date } | undefined {
  if (!dateRange.startDate && !dateRange.endDate) {
    return undefined;
  }

  const filter: { gte?: Date; lte?: Date } = {};
  if (dateRange.startDate) filter.gte = dateRange.startDate;
  if (dateRange.endDate) filter.lte = dateRange.endDate;
  return filter;
}
