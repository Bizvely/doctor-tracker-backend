import { escapeRegex } from "./queryHelpers";

// লেখা ভাঙার একটাই নিয়ম: অক্ষর, সংখ্যা, "+" ও অক্ষরের চিহ্ন (বাংলার কার-চিহ্ন) ছাড়া সবকিছু শব্দের সীমানা।
// সংরক্ষণের সময় ও খোঁজার সময় একই নিয়ম লাগে, নইলে মিলবে না।
const SPLIT_PATTERN = /[^\p{L}\p{M}\p{N}+]+/u;

// একবারে সর্বোচ্চ কয়টা শব্দ দিয়ে খোঁজা যাবে (বাড়তি শব্দে query ভারী হওয়া আটকাতে)
const MAX_QUERY_TERMS = 5;

function splitWords(text: string): string[] {
  return text
    .toLowerCase()
    // "Müller" ও "muller" একই ধরা: ল্যাটিন অক্ষরের উপরের চিহ্ন (ü, é) সরানো। বাংলা অক্ষরে প্রভাব পড়ে না।
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(SPLIT_PATTERN)
    .filter((word) => word.length > 0 && word !== "+");
}

// ডাক্তার/রোগীর খোঁজার শব্দ-তালিকা বানানো (যেমন "Dr. Sarah Johnson" -> dr, sarah, johnson)
export function buildSearchTokens(parts: Array<string | undefined>): string[] {
  const tokens = new Set<string>();
  for (const part of parts) {
    if (!part) continue;
    for (const word of splitWords(part)) {
      tokens.add(word);
      // "+8801..." নম্বরের "+" ছাড়া রূপও রাখা, যাতে "8801" লিখেও খোঁজা যায়
      if (word.startsWith("+")) tokens.add(word.slice(1));
    }
  }
  return [...tokens];
}

// খোঁজার লেখা থেকে শর্ত বানানো: প্রতিটা শব্দ কোনো না কোনো শব্দের শুরুর সাথে মিলতে হবে।
// "^" দিয়ে শুরু হওয়া regex index ব্যবহার করতে পারে (পুরো collection ঘাঁটতে হয় না)।
export function buildSearchConditions(search: string | undefined): Array<Record<string, unknown>> {
  if (!search) return [];
  return splitWords(search)
    .slice(0, MAX_QUERY_TERMS)
    .map((term) => ({ searchTokens: { $regex: `^${escapeRegex(term)}` } }));
}

// ডাক্তারের চার তথ্য থেকে শব্দ-তালিকা (তৈরি, edit, demo data ও পুরোনো data ঠিক করা: সব জায়গায় এটাই)
export function buildDoctorSearchTokens(doctor: {
  name: string;
  email: string;
  hospital: string;
  specialization: string;
}): string[] {
  return buildSearchTokens([doctor.name, doctor.email, doctor.hospital, doctor.specialization]);
}

// রোগীর নাম ও ফোন থেকে শব্দ-তালিকা
export function buildPatientSearchTokens(patient: { name: string; phone: string }): string[] {
  return buildSearchTokens([patient.name, patient.phone]);
}
