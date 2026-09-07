import { test, expect } from "@playwright/test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import EditorPreview from "../components/Admin/EditorPreview";

test("revalidation requires real admin authorization and security headers are served", async ({ request }) => {
    const home = await request.get("/");
    expect(home.headers()["content-security-policy"]).toContain("object-src 'none'");
    expect(home.headers()["x-powered-by"]).toBeUndefined();
    expect((await request.post("/api/revalidate", { data: { slug: "test-post-0" } })).status()).toBe(401);
    expect((await request.post("/api/revalidate", { headers: { Authorization: "Bearer not-admin" }, data: { slug: "test-post-0" } })).status()).toBe(403);
    const allowed = await request.post("/api/revalidate", { headers: { Authorization: "Bearer test-admin" }, data: { slug: "test-post-0" } });
    expect(allowed.ok()).toBe(true);
    expect(await allowed.json()).toMatchObject({ revalidated: true });
});

test("the preview iframe blocks injected scripts and access to its parent", async ({ page }) => {
    await page.goto("about:blank");
    await page.setContent(renderToStaticMarkup(createElement(EditorPreview, { html: "" })));
    const iframe = page.locator("iframe");
    await expect(iframe).toHaveAttribute("sandbox", "");
    await iframe.evaluate((element: HTMLIFrameElement) => {
        element.srcdoc = '<p>Preview rendered</p><script>parent.document.body.dataset.previewEscaped="yes"</script><img src="/missing-preview-image" onerror="parent.document.body.dataset.previewEscaped=\'yes\'">';
    });
    await expect(page.frameLocator("iframe").getByText("Preview rendered")).toBeVisible();
    expect(await page.locator("body").getAttribute("data-preview-escaped")).toBeNull();
    expect(await iframe.evaluate((element: HTMLIFrameElement) => {
        try { return element.contentWindow?.document !== undefined; }
        catch { return false; }
    })).toBe(false);
});
