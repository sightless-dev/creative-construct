import {getRequestConfig} from 'next-intl/server';
import {defaultLocale, locales} from './routing';

export default getRequestConfig(async ({requestLocale}) => {
  const rl = await requestLocale;
  const locale = (locales as readonly string[]).includes(rl) ? rl : defaultLocale;
  return { locale, messages: (await import(`../../messages/${locale}.json`)).default };
});
