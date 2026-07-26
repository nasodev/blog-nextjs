"""변환 산출물을 blog_posts에 적재 (backend-api 컨테이너 안에서 실행).

사용법:
  docker cp scripts/migration/out funq-backend-api-backend-api-1:/tmp/blog-migration
  docker exec funq-backend-api-backend-api-1 python /tmp/blog-migration/load_posts.py /tmp/blog-migration
(load_posts.py도 out/과 함께 복사해 두고 경로 인자로 out 디렉터리를 넘긴다)
"""

import json
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

from app.external.database import SessionLocal
from app.models.blog import BlogPost
from app.services.blog.content import process_content

# convert.mjs가 내려주는 published_at은 tz 정보 없는 KST 벽시계 문자열이다.
# 그대로 timestamptz 컬럼에 넣으면 UTC로 오인되어 프론트(KST)에서 +9h 재변환 시
# 날짜가 하루 밀린다 — 고정 오프셋(KST는 DST 없음)을 명시로 붙여 올바른 UTC 인스턴트로 저장한다.
KST = timezone(timedelta(hours=9))


def load(out_dir: Path) -> None:
    db = SessionLocal()
    created, updated = 0, 0
    try:
        for meta_path in sorted(out_dir.glob("*.json")):
            meta = json.loads(meta_path.read_text(encoding="utf-8"))
            html = (out_dir / f"{meta['slug']}.html").read_text(encoding="utf-8")
            processed = process_content(html)

            post = db.query(BlogPost).filter(BlogPost.slug == meta["slug"]).first()
            is_new = post is None
            if is_new:
                post = BlogPost(slug=meta["slug"])
                db.add(post)
                created += 1
            else:
                updated += 1

            post.title = meta["title"]
            post.description = meta["description"]
            post.author = meta["author"]
            post.content_html = processed.content_html
            post.cover_image_url = meta["cover_image_url"]
            post.tags = meta["tags"]
            post.toc = processed.toc
            post.reading_time_minutes = processed.reading_time_minutes
            post.is_published = meta["is_published"]
            post.published_at = datetime.fromisoformat(meta["published_at"]).replace(tzinfo=KST)
            post.updated_at = datetime.utcnow()
            print(f"{'NEW' if is_new else 'UPD'} {meta['slug']}")

        db.commit()
        total = db.query(BlogPost).count()
        print(f"\n적재 완료: 신규 {created}, 갱신 {updated}, DB 총 {total}건")
    finally:
        db.close()


if __name__ == "__main__":
    load(Path(sys.argv[1]))
