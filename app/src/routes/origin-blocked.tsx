import type { BlockedOriginDecision } from "../security/origin-policy";

const EXPLANATIONS: Record<BlockedOriginDecision["code"], string> = {
  RHP_ORIGIN_CONFIG_BLOCKED: "The required public preview configuration is unavailable, invalid, or no longer current.",
  RHP_ORIGIN_CONTEXT_INVALID: "This browser context cannot be verified for Real Holder Preview use.",
  RHP_ORIGIN_PROJECT_PAGES_FORBIDDEN: "The GitHub project Pages origin is reserved for the Synthetic Demo.",
  RHP_ORIGIN_EMBEDDED_CONTEXT: "Real Holder Preview cannot run inside an embedded page or frame.",
  RHP_ORIGIN_REDIRECT_REFUSED: "This navigation used a redirect and cannot establish the required origin boundary.",
  RHP_ORIGIN_BASE_PATH_MISMATCH: "Real Holder Preview requires the approved root hosting path.",
  RHP_ORIGIN_PATH_MISMATCH: "Real Holder Preview must start from its canonical root page.",
  RHP_ORIGIN_MISMATCH: "This is not the approved Real Holder Preview origin.",
  RHP_ORIGIN_MIGRATION_REFUSED: "Existing authority state cannot be migrated from another origin.",
  RHP_ORIGIN_TEST_PROFILE_INVALID: "The local test context is not authorized for generated test state.",
  RHP_ORIGIN_AUTOMATED_TEST_ONLY: "This context may use generated non-authoritative test state only."
};

export function OriginBlockedRoute({ decision }: { decision: BlockedOriginDecision }) {
  return <main id="main-content" className="shell-content" tabIndex={-1}>
    <section className="panel stack" role="alert" data-origin-block={decision.code}>
      <p className="eyebrow">Inspect-only boundary</p>
      <h1>Real Holder Preview is unavailable here.</h1>
      <p className="lede">{EXPLANATIONS[decision.code]}</p>
      <p>No holder storage, keys, imports, signing, resolver, or delivery path has been initialized.</p>
      <a className="button secondary" href="/preview/">Read preview limitations</a>
    </section>
  </main>;
}
