export function exportVerificationReport(report: unknown) {
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url; anchor.download = "hiri-passport-verification-report.json"; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
