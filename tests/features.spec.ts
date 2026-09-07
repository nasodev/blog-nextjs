import { test, expect } from "@playwright/test";
import { contactMailto } from "../lib/contact";
import siteMetaData from "../utils/siteMetaData";

test("contact drafts preserve Korean, special characters and line breaks without changing the recipient", () => {
    const data = new FormData();
    data.set("name", "  홍길동 & Team  ");
    data.set("email", "hello+blog@example.com");
    data.set("message", "Next.js 문의\nA&B? #기능\nbcc: nobody@example.com");
    const url = new URL(contactMailto(data));
    expect(contactMailto(data)).not.toContain("+"); // mailto uses %20, not form-encoded spaces.
    expect(url.protocol).toBe("mailto:");
    expect(url.pathname).toBe(siteMetaData.email);
    expect([...url.searchParams.keys()]).toEqual(["subject", "body"]);
    expect(url.searchParams.get("body")).toContain("이름: 홍길동 & Team\n이메일: hello+blog@example.com");
    expect(url.searchParams.get("body")).toContain(String(data.get("message")));
});
