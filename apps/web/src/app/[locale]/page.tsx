import Link from "next/link";
import {useTranslations} from "next-intl";
import HomeGallery from "./ui/HomeGallery";

export default function Home({params}: {params: {locale: string}}) {
  const t = useTranslations();
  const locale = params.locale;
  const featureKeys = ["library", "templates", "export"] as const;

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="text-lg font-semibold">Creative Construct</div>
          <nav className="flex items-center gap-4 text-sm text-neutral-600">
            <Link className="hover:text-neutral-900" href={`/${locale}/create`}>
              {t("nav.create")}
            </Link>
            <Link className="hover:text-neutral-900" href={`/${locale}/about`}>
              {t("nav.about")}
            </Link>
            <Link className="hover:text-neutral-900" href={`/${locale}/faq`}>
              {t("nav.faq")}
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1 text-xs text-neutral-500">
              {t("home.tagline")}
            </div>
            <h1 className="text-4xl font-semibold tracking-tight">{t("home.title")}</h1>
            <p className="text-base text-neutral-600">{t("home.subtitle")}</p>

            <div className="flex flex-wrap gap-3">
              <Link
                href={`/${locale}/create`}
                className="rounded-xl bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
              >
                {t("home.primaryCta")}
              </Link>
              <a
                href="http://localhost:4000/slot-games"
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-neutral-100"
              >
                {t("home.secondaryCta")}
              </a>
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <div className="text-sm font-medium text-neutral-700">{t("home.statusTitle")}</div>
            <div className="mt-4 space-y-3 text-sm text-neutral-600">
              <div className="flex items-center justify-between">
                <span>{t("home.status.api")}</span>
                <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs text-emerald-700">
                  {t("home.status.ok")}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>{t("home.status.library")}</span>
                <span className="rounded-full bg-blue-50 px-2 py-1 text-xs text-blue-700">
                  {t("home.status.ready")}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>{t("home.status.next")}</span>
                <span className="rounded-full bg-amber-50 px-2 py-1 text-xs text-amber-700">
                  {t("home.status.plan")}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {featureKeys.map((key) => (
            <div key={key} className="rounded-2xl border bg-white p-5">
              <div className="text-sm font-semibold">{t(`home.feature.${key}.title`)}</div>
              <div className="mt-2 text-sm text-neutral-600">{t(`home.feature.${key}.desc`)}</div>
            </div>
          ))}
        </div>

        <HomeGallery locale={locale} />
      </main>
    </div>
  );
}
