#!/usr/bin/env python3
"""Validate English draft payloads against public API originals; never writes to the API.

python3 scripts/validate-translations.py
python3 scripts/validate-translations.py --source-dir /path/to/api-snapshots
python3 scripts/validate-translations.py --self-test
"""

import argparse
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path
import re
from urllib.parse import unquote, urljoin, urlsplit
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[1]
API = "https://api.funq.kr"
SITE = "https://blog.funq.kr"
FIELDS = set("slug title description content_html author cover_image_url tags is_published".split())
READABLE = {"alt", "title", "aria-label", "aria-description", "placeholder"}
PROTECTED = {"pre", "code", "style", "script"}
BLOCKS = set("html head body div p h1 h2 h3 h4 h5 h6 section article aside header footer nav table thead tbody tfoot tr th td caption colgroup col ul ol li dl dt dd figure figcaption details summary pre style script img hr".split())
KOREAN = re.compile(r"[\uac00-\ud7a3\u3131-\u318e]")
# These are actual input strings, retained with English glosses in the chat article.
TRIGGERS = ("말랑아", "루팡아", "푸딩아", "마이콜아")


class Document(HTMLParser):
    def __init__(self, html):
        super().__init__(convert_charrefs=True)
        self.events, self.text, self.reader_attrs, self.links, self.ids, self.languages = [], [], [], [], [], []
        self.protected = []
        self.block, self.text_blocks = 0, set()
        self.counts = Counter()
        self.feed(html)
        self.close()

    def handle_starttag(self, tag, attrs):
        self.counts[tag] += 1
        self.events.append(("start", tag, [(k, None if k in READABLE else v) for k, v in attrs if k != "lang"]))
        if tag in BLOCKS:
            self.block = len(self.events)
        if tag in PROTECTED:
            self.protected.append(tag)
        for key, value in attrs:
            if key == "id":
                self.ids.append(value)
            if key == "href" and not self.protected:
                self.links.append(value)
            if key == "lang" and not self.protected:
                self.languages.append(value)
            if key in READABLE and not self.protected:
                self.reader_attrs.append(value or "")

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        self.handle_endtag(tag)

    def handle_endtag(self, tag):
        self.events.append(("end", tag))
        if tag in BLOCKS:
            self.block = len(self.events)
        if self.protected and self.protected[-1] == tag:
            self.protected.pop()

    def handle_data(self, text):
        if not self.protected and text.strip():
            self.text.append(text)
            self.text_blocks.add(self.block)


def validate(source, draft):
    slug = source["slug"]
    assert set(draft) == FIELDS, "payload fields differ"
    assert draft["slug"] == "en-" + slug, "English slug mismatch"
    assert re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", draft["slug"]), "invalid slug"
    assert len(draft["slug"]) <= 200, "slug too long"
    assert draft["is_published"] is False, "translation must remain a draft"
    for key in ("title", "description", "content_html", "author"):
        assert isinstance(draft[key], str) and draft[key].strip(), f"empty or invalid {key}"
    for key in ("author", "cover_image_url", "tags"):
        assert draft[key] == source[key], f"original {key} changed"
    assert isinstance(draft["tags"], list) and all(isinstance(tag, str) for tag in draft["tags"])
    original, english = Document(source["content_html"]), Document(draft["content_html"])
    assert original.events == english.events, "HTML structure or immutable attributes changed"
    assert original.counts == english.counts, "element counts differ"
    assert english.languages and set(english.languages) == {"en"}, "missing or incorrect content language"
    for tag in PROTECTED:
        pattern = rf"<{tag}\b[\s\S]*?</{tag}>"
        assert re.findall(pattern, source["content_html"]) == re.findall(pattern, draft["content_html"]), f"{tag} changed"
    for key in ("title", "description"):
        assert not KOREAN.search(draft[key]), f"untranslated {key}"
    prose = " ".join(english.text)
    if slug == "chat-claudecode-20251222-v01":
        for trigger in TRIGGERS:
            assert prose.count(trigger) == " ".join(original.text).count(trigger), "functional trigger changed"
            prose = prose.replace(trigger, "")
    assert not KOREAN.search(prose), "Korean remains outside preserved code or functional triggers"
    assert not any(KOREAN.search(value) for value in english.reader_attrs), "untranslated reader attribute"
    assert original.text_blocks == english.text_blocks, "reader text blocks were omitted or added"
    assert all(after.strip() for before, after in zip(original.reader_attrs, english.reader_attrs) if before.strip())
    for href in english.links:
        if href.startswith("#"):
            fragment = unquote(href[1:])
            if fragment in original.ids:
                assert fragment in english.ids, "TOC anchor target missing"
    return english


def get_json(url):
    with urlopen(url, timeout=30) as response:
        return json.load(response)


def self_test():
    source = dict(slug="sample", title="제목", description="설명", content_html='<h2 id="anchor">제목</h2><p>내용</p><pre><code>print(1)</code></pre><img src="x.png" alt="그림">', author="writer", cover_image_url=None, tags=["tag"])
    draft = dict(source, slug="en-sample", title="Title", description="Description", content_html='<h2 lang="en" id="anchor">Title</h2><p lang="en">Body</p><pre><code>print(1)</code></pre><img lang="en" src="x.png" alt="Image">', is_published=False)
    validate(source, draft)
    for change in ({"is_published": True}, {"slug": "en-wrong"}, {"content_html": draft["content_html"].replace("print(1)", "print(2)")}, {"title": "제목"}, {"content_html": draft["content_html"].replace("Body", "")}):
        try:
            validate(source, draft | change)
        except AssertionError:
            continue
        raise AssertionError(f"invalid draft accepted: {change}")
    print("Self-test passed: valid draft accepted; publication, slug, code, translation, and omission errors rejected.")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-dir", type=Path, help="saved public API detail JSONs instead of live requests")
    parser.add_argument("--report", type=Path, help="write validation evidence as JSON")
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    if args.self_test:
        self_test()
        return
    if args.source_dir:
        all_posts = [json.loads(path.read_text()) for path in sorted(args.source_dir.glob("*.json"))]
        sources = [post for post in all_posts if not post["slug"].startswith("en-") and post.get("is_published", True)]
    else:
        all_posts = get_json(API + "/blog/posts?size=1000")
        with ThreadPoolExecutor(max_workers=6) as pool:
            sources = list(pool.map(lambda post: get_json(API + "/blog/posts/" + post["slug"]), [post for post in all_posts if not post["slug"].startswith("en-")]))
    published = {post["slug"] for post in all_posts if post.get("is_published", True)}
    rows, errors = [], []
    for source in sources:
        slug = source["slug"]
        path = ROOT / "content" / slug / "en.json"
        if not path.exists() and "en-" + slug in published:
            continue
        try:
            draft = json.loads(path.read_text())
            document = validate(source, draft)
            for href in document.links:
                url = urlsplit(urljoin(SITE, href))
                if url.hostname == urlsplit(SITE).hostname and url.path.startswith(("/blogs/", "/en/blogs/")):
                    target = unquote(url.path.rstrip("/").split("/")[-1])
                    target = "en-" + target if url.path.startswith("/en/") else target
                    assert target in published, f"unpublished internal link: {href}"
            rows.append({"source_slug": slug, "title": draft["title"], "file": str(path.relative_to(ROOT)), "source_updated_at": source.get("updated_at"), "source_html_sha256": hashlib.sha256(source["content_html"].encode()).hexdigest(), "draft_sha256": hashlib.sha256(path.read_bytes()).hexdigest(), "counts": dict(document.counts), "status": "passed"})
            print(f"PASS {slug}")
        except (AssertionError, OSError, ValueError) as error:
            errors.append({"slug": slug, "error": str(error)})
            print(f"FAIL {slug}: {error}")
    if args.report:
        args.report.write_text(json.dumps({"checked_at": datetime.now(timezone.utc).isoformat(), "published_korean": len(sources), "published_english": sum(slug.startswith("en-") for slug in published), "posts": rows, "errors": errors}, ensure_ascii=False, indent=2) + "\n")
    print(f"{len(rows)} drafts passed; {len(errors)} failed.")
    if errors:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
