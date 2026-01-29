import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LanguageSelector } from "@/components/LanguageSelector";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  Calendar,
  DollarSign,
  Users,
  Clock,
  Shield,
  TrendingUp,
  CheckCircle,
  ArrowRight,
  Sparkles,
  BarChart3,
  Star,
  Zap,
  Check,
} from "lucide-react";

const Landing = () => {
  const { t } = useTranslation();

  const features = [
    { 
      icon: Calendar, 
      title: t("landing.featureOneTitle"), 
      body: t("landing.featureOneBody"),
      color: "text-blue-600 dark:text-blue-400"
    },
    { 
      icon: DollarSign, 
      title: t("landing.featureTwoTitle"), 
      body: t("landing.featureTwoBody"),
      color: "text-green-600 dark:text-green-400"
    },
    { 
      icon: Users, 
      title: t("landing.featureThreeTitle"), 
      body: t("landing.featureThreeBody"),
      color: "text-purple-600 dark:text-purple-400"
    },
    { 
      icon: Clock, 
      title: t("landing.featureFourTitle"), 
      body: t("landing.featureFourBody"),
      color: "text-orange-600 dark:text-orange-400"
    },
  ];

  const steps = [
    { title: t("landing.stepOneTitle"), body: t("landing.stepOneBody"), icon: CheckCircle },
    { title: t("landing.stepTwoTitle"), body: t("landing.stepTwoBody"), icon: Users },
    { title: t("landing.stepThreeTitle"), body: t("landing.stepThreeBody"), icon: TrendingUp },
  ];

  return (
    <div className="min-h-screen bg-background scroll-smooth">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 text-white shadow-lg">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div>
              <div className="text-xl font-bold tracking-tight text-foreground">{t("landing.brand")}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSelector />
            <Button variant="ghost" size="sm" asChild>
              <Link to="/auth">{t("landing.footerLogin")}</Link>
            </Button>
            <Button size="sm" asChild className="shadow-sm">
              <Link to="/auth">{t("landing.ctaPrimary")}</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/40">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-purple-50/30 to-background dark:from-blue-950/20 dark:via-purple-950/10 dark:to-background" />
        <div className="absolute inset-0 bg-grid-slate-900/[0.02] dark:bg-grid-slate-100/[0.02]" />
        <div className="relative mx-auto w-full max-w-7xl px-6 py-20 md:py-32">
          <div className="grid gap-12 md:grid-cols-2 md:items-center">
            <div className="space-y-8">
              <Badge variant="secondary" className="gap-1 px-3 py-1.5 shadow-sm">
                <Sparkles className="h-3.5 w-3.5" />
                {t("landing.heroBadge")}
              </Badge>
              <div className="space-y-4">
                <h1 className="text-5xl font-extrabold tracking-tight text-foreground md:text-6xl lg:text-7xl">
                  {t("landing.heroTitle")}
                </h1>
                <p className="text-xl text-muted-foreground md:text-2xl">
                  {t("landing.heroSubtitle")}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <Button size="lg" asChild className="gap-2 shadow-lg">
                  <Link to="/auth">
                    {t("landing.ctaPrimary")}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild className="gap-2">
                  <Link to="/auth">
                    {t("landing.ctaSecondary")}
                  </Link>
                </Button>
                <Badge variant="secondary" className="ml-2 gap-1.5 px-3 py-1.5">
                  <Zap className="h-3.5 w-3.5" />
                  {t("landing.freeTrial")}
                </Badge>
              </div>
            </div>

            {/* Feature Preview Card */}
            <div className="relative">
              <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-blue-600/20 to-purple-600/20 blur-2xl" />
              <Card className="relative border-border/50 shadow-2xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    {t("landing.snapshotTitle")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {["snapshotOne", "snapshotTwo", "snapshotThree"].map((key, index) => (
                    <div
                      key={key}
                      className="group flex items-start gap-3 rounded-xl border border-border bg-gradient-to-br from-muted/40 to-muted/20 p-4 transition-all hover:border-primary/50 hover:shadow-md"
                    >
                      <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {index + 1}
                      </div>
                      <div className="flex-1 text-sm text-foreground">{t(`landing.${key}`)}</div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Metrics */}
      <section className="border-b border-border/40 bg-muted/20">
        <div className="mx-auto w-full max-w-7xl px-6 py-16">
          <div className="grid gap-8 md:grid-cols-4">
            {[
              { label: t("landing.trustMetricOne"), value: "500+" },
              { label: t("landing.trustMetricTwo"), value: "50K+" },
              { label: t("landing.trustMetricThree"), value: "99.9%" },
              { label: t("landing.trustMetricFour"), value: "24/7" },
            ].map((metric) => (
              <div key={metric.label} className="text-center">
                <div className="text-4xl font-bold text-primary">{metric.value}</div>
                <div className="mt-2 text-sm text-muted-foreground">{metric.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto w-full max-w-7xl px-6 py-24">
        <div className="mb-12 text-center">
          <Badge variant="outline" className="mb-4">{t("landing.featuresSubtitle")}</Badge>
          <h2 className="text-3xl font-bold text-foreground md:text-4xl">{t("landing.featuresTitle")}</h2>
        </div>
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card
                key={feature.title}
                className="group relative overflow-hidden border-border/50 transition-all duration-300 hover:border-primary/50 hover:shadow-xl hover:-translate-y-1"
              >
                <CardHeader>
                  <div className={`mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 ${feature.color}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-base text-foreground">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {feature.body}
                </CardContent>
                <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
              </Card>
            );
          })}
        </div>
      </section>

      {/* Product Preview */}
      <section className="mx-auto w-full max-w-7xl px-6 py-24">
        <div className="mb-12 text-center">
          <Badge variant="outline" className="mb-4">{t("landing.productBadge")}</Badge>
          <h2 className="text-3xl font-bold text-foreground md:text-4xl">{t("landing.productTitle")}</h2>
          <p className="mt-3 text-muted-foreground">{t("landing.productSubtitle")}</p>
        </div>
        <div className="relative">
          <div className="absolute -inset-8 rounded-3xl bg-gradient-to-r from-blue-600/10 to-purple-600/10 blur-3xl" />
          <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-card shadow-2xl">
            <div className="aspect-video w-full bg-gradient-to-br from-blue-50/50 via-background to-purple-50/50 dark:from-blue-950/20 dark:via-background dark:to-purple-950/20 p-8">
              {/* Mock Dashboard Layout */}
              <div className="grid h-full grid-cols-12 gap-4">
                {/* Stats Cards */}
                <div className="col-span-12 grid grid-cols-3 gap-3">
                  <div className="rounded-lg border border-border/50 bg-card p-4 shadow-sm">
                    <div className="text-xs text-muted-foreground">{t("landing.todaysAppointments")}</div>
                    <div className="mt-1 text-2xl font-bold text-foreground">12</div>
                  </div>
                  <div className="rounded-lg border border-border/50 bg-card p-4 shadow-sm">
                    <div className="text-xs text-muted-foreground">{t("landing.monthlyRevenue")}</div>
                    <div className="mt-1 text-2xl font-bold text-green-600">$8,450</div>
                  </div>
                  <div className="rounded-lg border border-border/50 bg-card p-4 shadow-sm">
                    <div className="text-xs text-muted-foreground">{t("landing.activeClients")}</div>
                    <div className="mt-1 text-2xl font-bold text-foreground">142</div>
                  </div>
                </div>
                
                {/* Calendar Preview */}
                <div className="col-span-8 rounded-lg border border-border/50 bg-card p-4 shadow-sm">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="text-sm font-semibold text-foreground">{t("landing.calendarView")}</div>
                    <div className="flex gap-1">
                      {[...Array(7)].map((_, i) => (
                        <div key={i} className="h-2 w-2 rounded-full bg-primary/30" />
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {[...Array(14)].map((_, i) => (
                      <div
                        key={i}
                        className={`aspect-square rounded border ${
                          i === 5 || i === 8
                            ? "border-primary bg-primary/10"
                            : "border-border/30 bg-muted/30"
                        }`}
                      >
                        {i === 5 && (
                          <div className="flex h-full items-center justify-center">
                            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Upcoming Appointments */}
                <div className="col-span-4 rounded-lg border border-border/50 bg-card p-4 shadow-sm">
                  <div className="mb-3 text-sm font-semibold text-foreground">Upcoming</div>
                  <div className="space-y-2">
                    {[
                      { time: "10:00 AM", name: "Maria G." },
                      { time: "2:30 PM", name: "Carlos R." },
                      { time: "4:00 PM", name: "Ana L." },
                    ].map((apt, i) => (
                      <div key={i} className="flex items-center gap-2 rounded border border-border/30 bg-muted/20 p-2">
                        <div className="text-xs font-medium text-primary">{apt.time}</div>
                        <div className="text-xs text-muted-foreground">{apt.name}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-border/40 bg-muted/30">
        <div className="mx-auto w-full max-w-7xl px-6 py-24">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-foreground md:text-4xl">{t("landing.stepsTitle")}</h2>
            <p className="mt-3 text-muted-foreground">{t("landing.stepsSubtitle")}</p>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {steps.map((step, index) => {
              const StepIcon = step.icon;
              return (
                <div key={step.title} className="relative">
                  <div className="flex flex-col items-center text-center">
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
                      <StepIcon className="h-8 w-8" />
                    </div>
                    <div className="mb-2 text-sm font-bold text-primary">
                      {t("landing.stepLabel", { number: index + 1 })}
                    </div>
                    <div className="mb-3 text-lg font-semibold text-foreground">{step.title}</div>
                    <p className="text-sm text-muted-foreground">{step.body}</p>
                  </div>
                  {index < steps.length - 1 && (
                    <div className="absolute left-[calc(50%+4rem)] top-8 hidden h-0.5 w-[calc(100%-8rem)] bg-gradient-to-r from-primary/50 to-primary/20 md:block" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="mx-auto w-full max-w-7xl px-6 py-24">
        <div className="mb-12 text-center">
          <Badge variant="outline" className="mb-4">{t("landing.testimonialsBadge")}</Badge>
          <h2 className="text-3xl font-bold text-foreground md:text-4xl">{t("landing.testimonialsTitle")}</h2>
        </div>
        <div className="grid gap-8 md:grid-cols-3">
          {["testimonialOne", "testimonialTwo", "testimonialThree"].map((key) => (
            <Card key={key} className="border-border/50 bg-card transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
              <CardHeader>
                <div className="flex items-center gap-1 text-yellow-500">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-current" />
                  ))}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm italic text-muted-foreground">"{t(`landing.${key}Quote`)}"</p>
                <div>
                  <div className="font-semibold text-foreground">{t(`landing.${key}Name`)}</div>
                  <div className="text-xs text-muted-foreground">{t(`landing.${key}Role`)}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="border-y border-border/40 bg-muted/30">
        <div className="mx-auto w-full max-w-7xl px-6 py-24">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-foreground md:text-4xl">{t("landing.pricingTitle")}</h2>
            <p className="mt-3 text-muted-foreground">{t("landing.pricingSubtitle")}</p>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {["pricingBasic", "pricingPro", "pricingEnterprise"].map((key, index) => {
              const isPopular = index === 1;
              return (
                <Card
                  key={key}
                  className={`relative border-border/50 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${isPopular ? "border-primary shadow-xl scale-105" : ""}`}
                >
                  {isPopular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <Badge className="gap-1 shadow-lg">
                        <Star className="h-3 w-3" />
                        {t("landing.pricingPopular")}
                      </Badge>
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle className="text-xl text-foreground">{t(`landing.${key}Name`)}</CardTitle>
                    <CardDescription>{t(`landing.${key}Desc`)}</CardDescription>
                    <div className="mt-4">
                      <span className="text-4xl font-bold text-foreground">{t(`landing.${key}Price`)}</span>
                      <span className="text-muted-foreground">/{t("landing.pricingMonth")}</span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      {[1, 2, 3, 4].map((num) => (
                        <div key={num} className="flex items-start gap-2">
                          <Check className="h-4 w-4 mt-0.5 text-primary" />
                          <span className="text-sm text-muted-foreground">{t(`landing.${key}Feature${num}`)}</span>
                        </div>
                      ))}
                    </div>
                    <Button asChild className="w-full" variant={isPopular ? "default" : "outline"}>
                      <Link to="/auth">{t("landing.pricingCta")}</Link>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto w-full max-w-4xl px-6 py-24">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold text-foreground md:text-4xl">{t("landing.faqTitle")}</h2>
          <p className="mt-3 text-muted-foreground">{t("landing.faqSubtitle")}</p>
        </div>
        <Accordion type="single" collapsible className="space-y-4">
          {["faqOne", "faqTwo", "faqThree", "faqFour", "faqFive"].map((key, index) => (
            <AccordionItem key={key} value={`item-${index}`} className="rounded-lg border border-border bg-card px-6">
              <AccordionTrigger className="text-left font-semibold text-foreground hover:no-underline">
                {t(`landing.${key}Question`)}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                {t(`landing.${key}Answer`)}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* Security + CTA */}
      <section className="mx-auto w-full max-w-7xl px-6 py-24">
        <div className="grid gap-8 md:grid-cols-2">
          <Card className="border-border/50 bg-gradient-to-br from-card to-muted/20 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Shield className="h-6 w-6 text-green-600" />
                {t("landing.securityTitle")}
              </CardTitle>
              <CardDescription className="text-base">{t("landing.securityBody")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {["securityOne", "securityTwo", "securityThree"].map((key) => (
                  <div key={key} className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-sm text-foreground">{t(`landing.${key}`)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 to-purple-700 p-8 text-white shadow-2xl">
            <div className="absolute inset-0 bg-grid-white/[0.05]" />
            <div className="relative space-y-4">
              <h3 className="text-2xl font-bold">{t("landing.ctaTitle")}</h3>
              <p className="text-blue-100">{t("landing.ctaSubtitle")}</p>
              <div className="flex flex-wrap gap-3 pt-2">
                <Button size="lg" variant="secondary" asChild className="shadow-xl">
                  <Link to="/auth">{t("landing.ctaPrimary")}</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 bg-muted/30">
        <div className="mx-auto w-full max-w-7xl px-6 py-12">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 text-white shadow-lg">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div>
                <div className="text-base font-semibold text-foreground">{t("landing.brand")}</div>
                <div className="text-xs text-muted-foreground">{t("landing.footerTagline")}</div>
              </div>
            </div>
            <div className="flex gap-6 text-sm">
              <Link to="/auth" className="text-muted-foreground transition-colors hover:text-foreground">
                {t("landing.footerLogin")}
              </Link>
              <Link to="/auth" className="text-muted-foreground transition-colors hover:text-foreground">
                {t("landing.footerSignup")}
              </Link>
            </div>
          </div>
          <div className="mt-8 border-t border-border/40 pt-6 text-center text-xs text-muted-foreground">
            {new Date().getFullYear()} {t("landing.brand")}. {t("landing.footerRights")}
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
