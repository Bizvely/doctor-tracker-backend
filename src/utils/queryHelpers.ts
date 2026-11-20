import { ApiError } from "./ApiError";

// Search লেখায় থাকা বিশেষ চিহ্ন নিষ্ক্রিয় করা (regex injection আটকাতে)
export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// "2026-11-20" ধরনের তারিখকে বাংলাদেশ সময় (UTC+6) অনুযায়ী পুরো দিনের সীমায় রূপান্তর
export function dhakaDateRange(from?: string, to?: string): { $gte?: Date; $lte?: Date } | undefined {
  const range: { $gte?: Date; $lte?: Date } = {};
  if (from) range.$gte = new Date(`${from}T00:00:00.000+06:00`);
  if (to) range.$lte = new Date(`${to}T23:59:59.999+06:00`);
  return range.$gte || range.$lte ? range : undefined;
}

// URL-এর id সঠিক MongoDB id কিনা যাচাই
export function assertObjectId(id: string): void {
  if (!/^[a-f\d]{24}$/i.test(id)) {
    throw new ApiError(400, "Invalid id");
  }
}
