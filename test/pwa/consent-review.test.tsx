// @vitest-environment node
import { renderToStaticMarkup } from "react-dom/server"; import { describe, expect, it } from "vitest"; import { ConsentReview } from "../../app/src/routes/request/consent-review";
describe("consent review", () => { it("keeps decline visible and explains complete-public disclosure", () => { const html = renderToStaticMarkup(<ConsentReview request={{ verifier: { display: { name: "Synthetic verifier" } } }} onBack={() => {}} />); expect(html).toContain("Decline request"); expect(html).toContain("complete Credential Claim"); }); });
