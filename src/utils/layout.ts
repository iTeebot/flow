import { ChevronRight, ChevronLeft } from "lucide-react";

export type Direction = "ltr" | "rtl";

const rtlLanguages = ["ur", "ar", "he", "fa"];

export const getLanguageDirection = (lang: string): Direction => {
  return rtlLanguages.includes(lang.toLowerCase()) ? "rtl" : "ltr";
};

export const getForwardIcon = (dir: Direction) => {
  return dir === "rtl" ? ChevronLeft : ChevronRight;
};

export const getBackIcon = (dir: Direction) => {
  return dir === "rtl" ? ChevronRight : ChevronLeft;
};
