import {getRequestConfig} from "next-intl/server";

export default getRequestConfig(async ({locale}) => {
  const supported = ["ru", "en", "uk"] as const;
  const safeLocale = supported.includes(locale as any) ? locale : "ru";

  return {
    messages: (await import(`./messages/${safeLocale}.json`)).default
  };
});
