import siteMetaData from "@/utils/siteMetaData";

export function contactMailto(data: FormData) {
    const body = [
        `이름: ${String(data.get("name") ?? "").trim()}`,
        `이메일: ${String(data.get("email") ?? "").trim()}`,
        `전화번호: ${String(data.get("phone") ?? "").trim()}`,
        "",
        String(data.get("message") ?? "").trim(),
    ].join("\n");
    return `mailto:${siteMetaData.email}?subject=${encodeURIComponent("블로그 프로젝트 문의")}&body=${encodeURIComponent(body)}`;
}
