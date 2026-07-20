import test from "node:test";
import assert from "node:assert/strict";
import { evaluateCredentialEligibility } from "../../src/bvp/eligibility.mjs";
test("credential classes default closed", () => { assert.equal(evaluateCredentialEligibility({ classification: "email", holderAuthorization: true, completeDisclosureJustification: true, legalPolicy: { allowedClasses: ["email"] } }).result, "ineligible"); assert.equal(evaluateCredentialEligibility({ classification: "public-professional-license", holderAuthorization: true, completeDisclosureJustification: true, legalPolicy: { allowedClasses: ["public-professional-license"] } }).result, "eligible"); });
