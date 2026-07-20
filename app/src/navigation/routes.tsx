import type { ReactNode } from "react";
import { HomeRoute } from "../routes/home/home";
import { AcquireRoute } from "../routes/acquire/acquire";
import { RequestIngressRoute } from "../routes/request/request-ingress";
import { VerifierIngressRoute } from "../routes/verifier/verifier-ingress";
import { SettingsRoute } from "../routes/settings/keys-devices";
import { WelcomeRoute } from "../routes/onboarding/welcome";
import { CorrelationRoute } from "../routes/onboarding/correlation";
import { StorageReadinessRoute } from "../routes/onboarding/storage-readiness";
import { AuthoritySetupRoute } from "../routes/onboarding/authority-setup";
import { BackupSetupRoute } from "../routes/onboarding/backup-setup";
import { CredentialRoute } from "../routes/credential/credential-route";
import { SelfAssertionEditorRoute } from "../routes/self-assertion/self-assertion-editor";
import { PresentationSigningRoute } from "../routes/present/signing";
import { PresentationReceiptRoute } from "../routes/present/receipt";
import { PresentationDeliveryRoute } from "../routes/present/delivery";
import { PrivacyHistoryRoute } from "../routes/history/privacy-history";
import { HistoryDetailRoute } from "../routes/history/history-detail";
import { RotationRoute } from "../routes/settings/rotation";
import { DeviceAddRoute } from "../routes/settings/device-add";
import { DeviceRemoveRoute } from "../routes/settings/device-remove";
import { AppStorageRoute } from "../routes/settings/app-storage";
import { ExportReportRoute } from "../routes/verifier/export-report";

export const ROUTES: Record<string, { title: string; content: ReactNode }> = {
  "/": { title: "Welcome", content: <WelcomeRoute /> },
  "/onboarding/correlation": { title: "Stable authority", content: <CorrelationRoute /> },
  "/onboarding/storage": { title: "Device readiness", content: <StorageReadinessRoute /> },
  "/onboarding/authority": { title: "Authority setup", content: <AuthoritySetupRoute /> },
  "/onboarding/backup": { title: "Backup setup", content: <BackupSetupRoute /> },
  "/home": { title: "Passport", content: <HomeRoute /> },
  "/acquire": { title: "Add a credential", content: <AcquireRoute /> },
  "/request": { title: "Review a request", content: <RequestIngressRoute /> },
  "/verify": { title: "Verify a presentation", content: <VerifierIngressRoute /> },
  "/settings": { title: "Keys and settings", content: <SettingsRoute /> },
  "/settings/rotation": { title: "Rotate a key", content: <RotationRoute /> },
  "/settings/device-add": { title: "Add a device", content: <DeviceAddRoute /> },
  "/settings/device-remove": { title: "Remove a device", content: <DeviceRemoveRoute /> },
  "/settings/storage": { title: "Storage and offline", content: <AppStorageRoute /> },
  "/credential": { title: "Credential detail", content: <CredentialRoute /> },
  "/self-assertion": { title: "Self-assertion", content: <SelfAssertionEditorRoute /> },
  "/present/signing": { title: "Sign a presentation", content: <PresentationSigningRoute /> },
  "/present/receipt": { title: "Presentation receipt", content: <PresentationReceiptRoute /> },
  "/present/delivery": { title: "Deliver a presentation", content: <PresentationDeliveryRoute /> },
  "/history": { title: "Privacy history", content: <PrivacyHistoryRoute /> },
  "/history/detail": { title: "Disclosure receipt", content: <HistoryDetailRoute /> },
  "/verify/export": { title: "Export verification report", content: <ExportReportRoute /> }
};
