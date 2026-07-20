import type { Page } from "@playwright/test";
export class PassportPage { constructor(readonly page: Page) {} async open(path = "/") { await this.page.goto(`/#${path}`); } heading(name: string | RegExp) { return this.page.getByRole("heading", { level: 1, name }); } }
