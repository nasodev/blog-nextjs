"use client";

import { useState } from "react";
import { contactMailto } from "@/lib/contact";
import siteMetaData from "@/utils/siteMetaData";

export default function ContactForm() {
    const [opened, setOpened] = useState(false);
    const fieldClass = "w-full rounded-lg border border-dark/30 dark:border-light/40 bg-transparent px-3 py-2";
    return (
        <form className="mt-6 w-full space-y-4 text-base" onSubmit={(event) => {
            event.preventDefault();
            window.location.href = contactMailto(new FormData(event.currentTarget));
            setOpened(true);
        }}>
            <p>프로젝트 문의나 협업 제안을 남겨 주세요. 아래 버튼으로 이메일 앱에서 내용을 확인한 뒤 직접 전송할 수 있습니다.</p>
            <label className="block">이름 <span aria-hidden="true">*</span>
                <input name="name" autoComplete="name" required maxLength={80} className={fieldClass} />
            </label>
            <label className="block">이메일 <span aria-hidden="true">*</span>
                <input name="email" type="email" autoComplete="email" required maxLength={254} className={fieldClass} />
            </label>
            <label className="block">전화번호 (선택)
                <input name="phone" type="tel" autoComplete="tel" maxLength={30} className={fieldClass} />
            </label>
            <label className="block">문의 내용 <span aria-hidden="true">*</span>
                <textarea name="message" required maxLength={2000} rows={4} className={fieldClass} />
            </label>
            <button type="submit" className="rounded-lg bg-accent text-light px-5 py-3">이메일 앱에서 작성</button>
            <p role="status" className="text-sm">{opened ? "이메일 앱에서 전송을 완료해 주세요. 앱이 열리지 않으면 아래 주소로 직접 보내 주세요." : "이 사이트는 입력한 문의 내용을 저장하지 않습니다."}</p>
            <a href={`mailto:${siteMetaData.email}`} className="inline-block underline">{siteMetaData.email}</a>
        </form>
    );
}
