import { useState } from "react";
import type { LocalAuthentication } from "../../adapters/local-auth";
import type {
  HolderOnboardingCompletion,
  OnboardingReadiness,
  OnboardingService
} from "../../services/onboarding-service";
import { UnsupportedBrowserRoute } from "../unsupported-browser";
import { RealAuthoritySetupRoute } from "./authority-setup";
import { RealCorrelationRoute } from "./correlation";
import { LocalAuthRoute } from "./local-auth";
import { RealStorageReadinessRoute } from "./storage-readiness";
import { RealHolderWelcomeRoute } from "./welcome";

type OnboardingStep = "welcome" | "correlation" | "storage" | "local-auth" | "authority" | "unsupported";

export function RealHolderOnboardingFlow({ service, authentication, stateHash, onComplete }: Readonly<{
  service: OnboardingService;
  authentication: LocalAuthentication;
  stateHash: string;
  onComplete(result: HolderOnboardingCompletion): void;
}>) {
  const [step, setStep] = useState<OnboardingStep>("welcome");
  const [unsupported, setUnsupported] = useState<OnboardingReadiness | null>(null);

  const cancel = () => {
    authentication.invalidate();
    setUnsupported(null);
    setStep("welcome");
  };

  if (step === "unsupported") return <UnsupportedBrowserRoute readiness={unsupported ?? undefined} />;
  if (step === "correlation") return <RealCorrelationRoute onContinue={() => setStep("storage")} onCancel={cancel} />;
  if (step === "storage") return <RealStorageReadinessRoute
    service={service}
    stateHash={stateHash}
    onReady={() => setStep("local-auth")}
    onUnsupported={readiness => {
      setUnsupported(readiness);
      setStep("unsupported");
    }}
    onCancel={cancel}
  />;
  if (step === "local-auth") return <LocalAuthRoute
    authentication={authentication}
    stateHash={stateHash}
    onReady={() => setStep("authority")}
  />;
  if (step === "authority") return <RealAuthoritySetupRoute
    service={service}
    stateHash={stateHash}
    onComplete={onComplete}
    onCancel={cancel}
  />;
  return <RealHolderWelcomeRoute onContinue={() => setStep("correlation")} />;
}
