/** ใช้ร่วมกันระหว่าง client และ server — ห้าม import sharp/exceljs ในไฟล์นี้ */

export type Heart4RoomsExportImagePreset = "original" | "balanced" | "compact";

export type Heart4RoomsExportImageOptions = {
  preset: Heart4RoomsExportImagePreset;
};

export const DEFAULT_HEART4_EXPORT_IMAGE_OPTIONS: Heart4RoomsExportImageOptions = {
  preset: "compact",
};
