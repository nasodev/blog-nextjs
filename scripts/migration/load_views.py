"""Supabase views CSV를 blog_posts.view_count로 이관 (컨테이너 안에서 실행).

사용법:
  docker cp scripts/migration/views.csv funq-backend-api-backend-api-1:/tmp/blog-migration/
  docker cp scripts/migration/load_views.py funq-backend-api-backend-api-1:/tmp/blog-migration/
  docker exec funq-backend-api-backend-api-1 python /tmp/blog-migration/load_views.py /tmp/blog-migration/views.csv
"""

import csv
import sys
from pathlib import Path

from app.external.database import SessionLocal
from app.models.blog import BlogPost


def load(csv_path: Path) -> None:
    db = SessionLocal()
    matched, missing = 0, []
    try:
        with csv_path.open(encoding="utf-8") as f:
            for row in csv.DictReader(f):
                slug, count = row["slug"], int(row["count"])
                post = db.query(BlogPost).filter(BlogPost.slug == slug).first()
                if post is None:
                    missing.append(slug)
                    continue
                post.view_count = count
                matched += 1
        db.commit()
        print(f"이관 완료: {matched}건")
        if missing:
            print(f"매칭 실패 slug (확인 필요): {missing}")
    finally:
        db.close()


if __name__ == "__main__":
    load(Path(sys.argv[1]))
