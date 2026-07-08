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
  User,
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
    <div className="min-h-screen bg-background scroll-smooth font-sans antialiased">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <span className="truncate text-lg font-semibold tracking-tight text-foreground">{t("landing.brand")}</span>
          </div>
          <nav className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <LanguageSelector />
            <Button variant="ghost" size="sm" asChild className="hidden text-muted-foreground hover:text-foreground sm:inline-flex">
              <Link to="/auth">{t("landing.footerLogin")}</Link>
            </Button>
            <Button size="sm" asChild className="rounded-lg bg-primary px-3 shadow-sm sm:px-4">
              <Link to="/auth">
                <span className="sm:hidden">{t("landing.ctaPrimaryShort")}</span>
                <span className="hidden sm:inline">{t("landing.ctaPrimary")}</span>
              </Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-mesh" />
        <div className="absolute inset-0 bg-grid-pattern opacity-50" />
        <div className="relative mx-auto max-w-6xl px-6 py-24 md:py-32">
          <div className="grid gap-16 md:grid-cols-2 md:items-center">
            <div className="space-y-8 opacity-0 animate-fade-in-up [animation-fill-mode:forwards]">
              <Badge variant="secondary" className="gap-1.5 rounded-full px-4 py-1.5 font-medium">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                {t("landing.heroBadge")}
              </Badge>
              <div className="space-y-5">
                <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight text-foreground md:text-5xl lg:text-6xl">
                  {t("landing.heroTitle")}
                </h1>
                <p className="max-w-lg text-lg text-muted-foreground md:text-xl">
                  {t("landing.heroSubtitle")}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button size="lg" asChild className="gap-2 rounded-xl px-6 shadow-lg shadow-primary/25 transition-all hover:shadow-xl">
                  <Link to="/auth">
                    {t("landing.ctaPrimary")}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild className="gap-2 rounded-xl border-2 px-6">
                  <Link to="/auth">{t("landing.ctaSecondary")}</Link>
                </Button>
                <Badge variant="outline" className="gap-1.5 rounded-full border-emerald-500/50 bg-emerald-500/5 px-3 py-1.5 text-emerald-700 dark:text-emerald-400">
                  <Zap className="h-3.5 w-3.5" />
                  {t("landing.freeTrial")}
                </Badge>
              </div>
            </div>

            {/* Feature Preview Card */}
            <div className="relative animate-fade-in-up opacity-0" style={{ animationDelay: "150ms", animationFillMode: "forwards" }}>
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-blue-500/20 via-indigo-500/20 to-purple-500/20 blur-xl" />
              <Card className="relative overflow-hidden border-0 bg-card/95 shadow-xl shadow-black/5 backdrop-blur">
                <div className="absolute right-0 top-0 h-32 w-32 translate-x-8 -translate-y-8 rounded-full bg-primary/10 blur-2xl" />
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                      <BarChart3 className="h-4 w-4 text-primary" />
                    </div>
                    {t("landing.snapshotTitle")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {["snapshotOne", "snapshotTwo", "snapshotThree"].map((key, index) => (
                    <div
                      key={key}
                      className="group flex items-start gap-3 rounded-xl border border-border/60 bg-muted/30 p-4 transition-all duration-200 hover:border-primary/30 hover:bg-muted/50"
                    >
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-sm font-semibold text-primary">
                        {index + 1}
                      </div>
                      <span className="text-sm leading-relaxed text-foreground">{t(`landing.${key}`)}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Metrics */}
      <section className="border-y border-border/40 bg-muted/30 py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-10 sm:grid-cols-2 md:grid-cols-4">
            {[
              { label: t("landing.trustMetricOne"), value: "500+" },
              { label: t("landing.trustMetricTwo"), value: "50K+" },
              { label: t("landing.trustMetricThree"), value: "99.9%" },
              { label: t("landing.trustMetricFour"), value: "24/7" },
            ].map((metric) => (
              <div key={metric.label} className="text-center">
                <div className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">{metric.value}</div>
                <div className="mt-1.5 text-sm font-medium text-muted-foreground">{metric.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="mb-16 text-center">
          <Badge variant="outline" className="mb-4 rounded-full px-3">{t("landing.featuresSubtitle")}</Badge>
          <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">{t("landing.featuresTitle")}</h2>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card
                key={feature.title}
                className="group relative overflow-hidden border border-border/60 bg-card transition-all duration-300 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1"
              >
                <CardHeader className="pb-2">
                  <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 ${feature.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-base font-semibold text-foreground">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed text-muted-foreground">{feature.body}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Product Preview */}
      <section className="border-y border-border/40 bg-muted/20 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-14 text-center">
            <Badge variant="outline" className="mb-4 rounded-full">{t("landing.productBadge")}</Badge>
            <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">{t("landing.productTitle")}</h2>
            <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">{t("landing.productSubtitle")}</p>
          </div>
          <div className="relative">
            <div className="absolute -inset-4 rounded-2xl bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 blur-2xl" />
            <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card shadow-xl">
              <div className="aspect-video w-full bg-gradient-to-br from-slate-50 via-white to-slate-50 p-4 sm:p-6 lg:p-8 dark:from-slate-900/50 dark:via-background dark:to-slate-900/50">
                <div className="flex h-full flex-col gap-3 sm:gap-4">
                  {/* Dashboard header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-sm font-semibold text-foreground">{t("dashboard.title")}</div>
                      <div className="text-xs text-muted-foreground">{t("dashboard.welcome")}</div>
                    </div>
                    <Badge variant="secondary" className="hidden text-xs sm:inline-flex">{t("dashboard.quickActions")}</Badge>
                  </div>

                  {/* Dashboard stats */}
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
                    <div className="rounded-xl border border-border/50 bg-white/80 p-3 shadow-sm dark:bg-card/80">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{t("dashboard.todaysRevenue")}</span>
                        <DollarSign className="h-3.5 w-3.5" />
                      </div>
                      <div className="mt-1 text-lg font-semibold text-foreground">$8,450</div>
                      <div className="text-[10px] text-muted-foreground">{t("dashboard.totalPaymentsReceived")}</div>
                    </div>
                    <div className="rounded-xl border border-border/50 bg-white/80 p-3 shadow-sm dark:bg-card/80">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{t("dashboard.clientsWithAppointmentsToday")}</span>
                        <Users className="h-3.5 w-3.5" />
                      </div>
                      <div className="mt-1 text-lg font-semibold text-foreground">18</div>
                      <div className="text-[10px] text-muted-foreground">{t("dashboard.clientsWithAppointmentsTodayDesc")}</div>
                    </div>
                    <div className="rounded-xl border border-border/50 bg-white/80 p-3 shadow-sm dark:bg-card/80">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{t("dashboard.todaysAppointments")}</span>
                        <Calendar className="h-3.5 w-3.5" />
                      </div>
                      <div className="mt-1 text-lg font-semibold text-foreground">12</div>
                      <div className="text-[10px] text-muted-foreground">{t("dashboard.scheduledForToday")}</div>
                    </div>
                    <div className="rounded-xl border border-border/50 bg-white/80 p-3 shadow-sm dark:bg-card/80">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{t("dashboard.pendingAppointments")}</span>
                        <Clock className="h-3.5 w-3.5" />
                      </div>
                      <div className="mt-1 text-lg font-semibold text-foreground">5</div>
                      <div className="text-[10px] text-muted-foreground">{t("dashboard.nextScheduledSessions")}</div>
                    </div>
                  </div>

                  {/* Main content */}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-12 sm:gap-4">
                    <div className="rounded-xl border border-border/50 bg-white/80 p-3 sm:col-span-8 sm:p-4 shadow-sm dark:bg-card/80">
                      <div className="mb-3">
                        <div className="text-sm font-semibold text-foreground">{t("dashboard.upcomingAppointmentsTitle")}</div>
                        <div className="text-xs text-muted-foreground">{t("dashboard.nextScheduledSessions")}</div>
                      </div>
                      <div className="space-y-2">
                        {[
                          { name: "Maria G.", treatment: "Massage Therapy", time: "10:00 AM", status: t("appointments.scheduled"), statusClass: "bg-blue-100 text-blue-800" },
                          { name: "Carlos R.", treatment: "Physiotherapy", time: "2:30 PM", status: t("appointments.completed"), statusClass: "bg-green-100 text-green-800" },
                          { name: "Ana L.", treatment: "Chiropractic", time: "4:00 PM", status: t("appointments.noShow"), statusClass: "bg-orange-100 text-orange-800" },
                        ].map((apt) => (
                          <div key={`${apt.name}-${apt.time}`} className="flex items-center gap-3 rounded-lg border border-border/40 bg-muted/20 p-2.5">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                              <User className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-medium text-foreground">{apt.name}</div>
                              <div className="text-[10px] text-muted-foreground">{apt.treatment}</div>
                            </div>
                            <div className="hidden text-[10px] text-muted-foreground sm:block">{apt.time}</div>
                            <Badge className={`text-[10px] ${apt.statusClass}`}>{apt.status}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-xl border border-border/50 bg-white/80 p-3 sm:col-span-4 sm:p-4 shadow-sm dark:bg-card/80">
                      <div className="mb-3 text-sm font-semibold text-foreground">{t("dashboard.quickActions")}</div>
                      <div className="space-y-2">
                        {[
                          t("dashboard.newAppointment"),
                          t("dashboard.addClient"),
                          t("dashboard.recordPayment"),
                        ].map((action) => (
                          <div key={action} className="rounded-lg border border-border/40 bg-muted/30 px-3 py-2 text-[11px] font-medium text-foreground">
                            {action}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="mb-16 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">{t("landing.stepsTitle")}</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">{t("landing.stepsSubtitle")}</p>
        </div>
        <div className="grid gap-12 md:grid-cols-3">
          {steps.map((step, index) => {
            const StepIcon = step.icon;
            return (
              <div key={step.title} className="relative text-center">
                <div className="mb-5 flex justify-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
                    <StepIcon className="h-7 w-7" />
                  </div>
                </div>
                <Badge variant="secondary" className="mb-3 text-xs">
                  {t("landing.stepLabel", { number: index + 1 })}
                </Badge>
                <h3 className="mb-2 text-lg font-semibold text-foreground">{step.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{step.body}</p>
                {index < steps.length - 1 && (
                  <div className="absolute right-0 top-7 hidden h-px w-[calc(50%-3.5rem)] bg-gradient-to-r from-transparent via-border to-transparent md:block" />
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Testimonials */}
      <section className="border-y border-border/40 bg-muted/20 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-14 text-center">
            <Badge variant="outline" className="mb-4 rounded-full">{t("landing.testimonialsBadge")}</Badge>
            <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">{t("landing.testimonialsTitle")}</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {["testimonialOne", "testimonialTwo", "testimonialThree"].map((key) => (
              <Card key={key} className="border-border/60 bg-card transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
                <CardHeader className="pb-2">
                  <div className="flex gap-0.5 text-amber-500">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm leading-relaxed italic text-muted-foreground">"{t(`landing.${key}Quote`)}"</p>
                  <div>
                    <div className="font-semibold text-foreground">{t(`landing.${key}Name`)}</div>
                    <div className="text-xs text-muted-foreground">{t(`landing.${key}Role`)}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="mb-14 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">{t("landing.pricingTitle")}</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">{t("landing.pricingSubtitle")}</p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {["pricingBasic", "pricingPro", "pricingEnterprise"].map((key, index) => {
            const isPopular = index === 1;
            return (
              <Card
                key={key}
                className={`relative border-2 transition-all duration-300 hover:shadow-lg ${
                  isPopular
                    ? "border-primary shadow-lg shadow-primary/10 scale-[1.02]"
                    : "border-border/60 hover:border-primary/30"
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="gap-1 rounded-full bg-primary px-3 shadow-md">
                      <Star className="h-3 w-3 fill-current" />
                      {t("landing.pricingPopular")}
                    </Badge>
                  </div>
                )}
                <CardHeader className={isPopular ? "pt-8" : ""}>
                  <CardTitle className="text-lg font-semibold text-foreground">{t(`landing.${key}Name`)}</CardTitle>
                  <CardDescription className="text-sm">{t(`landing.${key}Desc`)}</CardDescription>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-foreground">{t(`landing.${key}Price`)}</span>
                    <span className="text-muted-foreground">/{t("landing.pricingMonth")}</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    {[1, 2, 3, 4].map((num) => (
                      <div key={num} className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span className="text-sm text-muted-foreground">{t(`landing.${key}Feature${num}`)}</span>
                      </div>
                    ))}
                  </div>
                  <Button asChild className="w-full rounded-xl" variant={isPopular ? "default" : "outline"}>
                    <Link to="/auth">{t("landing.pricingCta")}</Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* FAQ */}
      <section className="border-y border-border/40 bg-muted/20 py-24">
        <div className="mx-auto max-w-3xl px-6">
          <div className="mb-14 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">{t("landing.faqTitle")}</h2>
            <p className="mt-3 text-muted-foreground">{t("landing.faqSubtitle")}</p>
          </div>
          <Accordion type="single" collapsible className="space-y-3">
            {["faqOne", "faqTwo", "faqThree", "faqFour", "faqFive"].map((key, index) => (
              <AccordionItem
                key={key}
                value={`item-${index}`}
                className="rounded-xl border border-border/60 bg-card px-5 transition-colors hover:border-primary/30"
              >
                <AccordionTrigger className="py-5 text-left font-medium text-foreground hover:no-underline [&[data-state=open]]:text-primary">
                  {t(`landing.${key}Question`)}
                </AccordionTrigger>
                <AccordionContent className="pb-5 text-sm leading-relaxed text-muted-foreground">
                  {t(`landing.${key}Answer`)}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Security + CTA */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="grid gap-8 md:grid-cols-2">
          <Card className="border-border/60 bg-card shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl font-semibold">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                  <Shield className="h-5 w-5 text-emerald-600 dark:text-emerald-500" />
                </div>
                {t("landing.securityTitle")}
              </CardTitle>
              <CardDescription className="text-base leading-relaxed">{t("landing.securityBody")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {["securityOne", "securityTwo", "securityThree"].map((key) => (
                  <div key={key} className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-500" />
                    <span className="text-sm text-foreground">{t(`landing.${key}`)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 p-8 text-white shadow-xl">
            <div className="absolute inset-0 bg-grid-pattern-light opacity-50" />
            <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
            <div className="relative space-y-4">
              <h3 className="text-2xl font-bold tracking-tight">{t("landing.ctaTitle")}</h3>
              <p className="text-blue-100/90">{t("landing.ctaSubtitle")}</p>
              <Button size="lg" variant="secondary" asChild className="mt-2 rounded-xl bg-white text-foreground shadow-lg hover:bg-white/90">
                <Link to="/auth">{t("landing.ctaPrimary")}</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-muted/30 py-12">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div>
                <div className="font-semibold text-foreground">{t("landing.brand")}</div>
                <div className="text-xs text-muted-foreground">{t("landing.footerTagline")}</div>
              </div>
            </div>
            <nav className="flex gap-8 text-sm">
              <Link to="/auth" className="text-muted-foreground transition-colors hover:text-foreground">
                {t("landing.footerLogin")}
              </Link>
              <Link to="/auth" className="text-muted-foreground transition-colors hover:text-foreground">
                {t("landing.footerSignup")}
              </Link>
            </nav>
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
