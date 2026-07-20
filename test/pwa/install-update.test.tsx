// @vitest-environment node
import { renderToStaticMarkup } from "react-dom/server"; import { describe, expect, it } from "vitest"; import { UpdatePrompt } from "../../app/src/components/pwa/update-prompt";
describe("install and update", () => { it("does not render an update action without a waiting worker", () => expect(renderToStaticMarkup(<UpdatePrompt registration={null} />)).toBe("")); });
