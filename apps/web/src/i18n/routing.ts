import {defineRouting} from "next-intl/routing";

export const routing = defineRouting({
  locales: ["ru", "en", "uk"],
  defaultLocale: "ru"
});

export type AppLocale = (typeof routing.locales)[number];
