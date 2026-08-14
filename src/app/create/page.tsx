"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { createTripAction } from "~/app/actions/trips";
import { announceNavigationStart } from "~/lib/navigation-feedback";
import { StepBasics } from "~/components/modules/trip-creator/step-basics";
import { StepModules } from "~/components/modules/trip-creator/step-modules";
import { StepAdmin } from "~/components/modules/trip-creator/step-admin";
import { StepMembers } from "~/components/modules/trip-creator/step-members";
import { StepTeams } from "~/components/modules/trip-creator/step-teams";
import { StepReview } from "~/components/modules/trip-creator/step-review";
import type { TripFormData } from "~/components/modules/trip-creator";
import { DEFAULT_DASHBOARD_WIDGETS, DEFAULT_TRIP_MODULES } from "~/lib/trip-config";

const INITIAL_DATA: TripFormData = {
  name: "",
  dateRange: { from: undefined, to: undefined },
  destinationName: "",
  destinationAddress: "",
  destinationMapUrl: "",
  defaultCurrency: "PLN",
  playlistUrl: "",
  modules: {
    ...DEFAULT_TRIP_MODULES,
    shopping: true,
    finances: true,
    packing: true,
  },
  dashboardWidgets: DEFAULT_DASHBOARD_WIDGETS,
  adminName: "",
  adminPin: "",
  members: [],
  teams: [],
  memberAssignments: {},
  packingPresets: ["essentials"],
};

export default function TripCreator() {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [formData, setFormData] = useState<TripFormData>(INITIAL_DATA);
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const steps =
    formData.modules.scoreboard && formData.dashboardWidgets.includes("scoreboard")
      ? (["basics", "modules", "admin", "members", "teams", "review"] as const)
      : (["basics", "modules", "admin", "members", "review"] as const);
  const currentStep = steps[stepIndex] ?? "basics";
  const progressPercent = ((stepIndex + 1) / steps.length) * 100;

  const nullable = (value: string) => value.trim() || null;

  const handleSubmit = async () => {
    setIsLoading(true);
    setSubmitError(null);
    try {
      // Formatujemy natywne obiekty Date na YYYY-MM-DD dla Supabase
      const start = formData.dateRange.from ? format(formData.dateRange.from, "yyyy-MM-dd") : null;
      const end = formData.dateRange.to ? format(formData.dateRange.to, "yyyy-MM-dd") : null;

      const result = await createTripAction({
        name: formData.name,
        startDate: start,
        endDate: end,
        destinationName: nullable(formData.destinationName),
        destinationAddress: nullable(formData.destinationAddress),
        destinationMapUrl: nullable(formData.destinationMapUrl),
        defaultCurrency: formData.defaultCurrency,
        playlistUrl: nullable(formData.playlistUrl),
        modules: formData.modules,
        dashboardWidgets: formData.dashboardWidgets,
        adminName: formData.adminName,
        adminPin: formData.adminPin,
        members: formData.members,
        teams: formData.teams,
        memberAssignments: formData.memberAssignments,
        packingPresets: formData.packingPresets,
      });

      if (!result.ok) {
        setSubmitError(result.error);
        setIsLoading(false);
        return;
      }

      announceNavigationStart();
      router.replace(`/t/${result.urlKey}`);
      router.refresh();
    } catch (error) {
      console.error(error);
      setSubmitError("Nie udało się utworzyć wyjazdu.");
      setIsLoading(false);
    }
  };

  const next = () => setStepIndex((index) => Math.min(index + 1, steps.length - 1));
  const back = () => setStepIndex((index) => Math.max(index - 1, 0));
  const cancel = () => {
    announceNavigationStart();
    router.push("/");
  };

  return (
    <div className="animate-fade-in flex min-h-dvh w-full flex-col items-center px-4 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-[calc(env(safe-area-inset-bottom)+1.5rem)] sm:justify-center">
      <div className="flex w-full max-w-md flex-col gap-6">
        {submitError && (
          <div className="border-theme-danger/30 bg-theme-danger/10 text-theme-danger rounded-xl border px-4 py-3 text-center text-sm font-bold">
            {submitError}
          </div>
        )}
        <div className="flex w-full flex-col gap-2">
          <div className="text-theme-muted flex justify-between text-[10px] font-bold tracking-widest uppercase">
            <span>
              Krok {stepIndex + 1} z {steps.length}
            </span>
            <span>{currentStep === "review" ? "Podsumowanie" : "Konfiguracja"}</span>
          </div>
          <div className="bg-theme-text/10 h-1.5 w-full overflow-hidden rounded-full">
            <div
              className="bg-theme-primary h-full transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {currentStep === "basics" && (
          <StepBasics data={formData} setData={setFormData} onNext={next} onCancel={cancel} />
        )}
        {currentStep === "modules" && (
          <StepModules data={formData} setData={setFormData} onNext={next} onBack={back} />
        )}
        {currentStep === "admin" && (
          <StepAdmin data={formData} setData={setFormData} onNext={next} onBack={back} />
        )}
        {currentStep === "members" && (
          <StepMembers data={formData} setData={setFormData} onBack={back} onNext={next} />
        )}
        {currentStep === "teams" &&
          formData.modules.scoreboard &&
          formData.dashboardWidgets.includes("scoreboard") && (
            <StepTeams
              data={formData}
              setData={setFormData}
              onBack={back}
              onSubmit={next}
              isSubmitting={false}
            />
          )}
        {currentStep === "review" && (
          <StepReview
            data={formData}
            onBack={back}
            onSubmit={handleSubmit}
            isSubmitting={isLoading}
          />
        )}
      </div>
    </div>
  );
}
