/* A short list of blocked words for usernames and display names (Thai + English).
   Matching is a substring check on the lower-cased name with spaces, dots and dashes removed. Add more as needed. */
const BLOCK = [
  "fuck", "shit", "bitch", "cunt", "pussy", "nigger", "nigga", "whore", "slut", "porn", "nazi", "hitler",
  "เหี้ย", "สัส", "ควย", "เย็ด", "แตด", "ส้นตีน", "ไอ้สัตว์", "อีดอก", "กะหรี่", "มึง", "ระยำ", "ชาติหมา",
];
export function badWord(name){
  const n = String(name || "").toLowerCase().replace(/[\s._\-]+/g, "");
  return BLOCK.some(w => n.includes(w));
}
