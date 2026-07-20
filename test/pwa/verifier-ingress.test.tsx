// @vitest-environment node
import { renderToStaticMarkup } from "react-dom/server"; import { describe, expect, it } from "vitest"; import { VerifierIngressRoute } from "../../app/src/routes/verifier/verifier-ingress";
describe("verifier ingress", () => { it("cannot read holder portfolio or auto-upload claims", () => { const html = renderToStaticMarkup(<VerifierIngressRoute />); expect(html).toContain("cannot read the holder portfolio"); expect(html).toContain("does not upload claim content"); }); });
