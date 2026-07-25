# Blog API Domain Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** backend-api에 블로그 도메인(`/blog/*`)을 추가한다 — 글 CRUD, 이미지 업로드/서빙, 조회수, 관리자 인증.

**Architecture:** 기존 컨벤션 그대로 — SQLAlchemy 모델 + Alembic 마이그레이션, Pydantic 스키마, Protocol 기반 서비스 + DI, APIRouter, Fake 주입 integration 테스트. 콘텐츠 처리(TOC 추출/리딩타임)는 순수 함수로 분리해 unit 테스트.

**Tech Stack:** FastAPI 0.115, SQLAlchemy 2.0, Alembic, PostgreSQL(JSONB), BeautifulSoup4(신규 의존성), pytest.

**Spec:** `C:\dev\blog-nextjs\docs\superpowers\specs\2026-07-25-content-pipeline-design.md` (§2 아키텍처, §2.2 데이터 모델, §2.3 API)

## Global Constraints

- 인증: 기존 `get_current_user`(Firebase) 재사용. 관리자는 환경변수 `BLOG_ADMIN_UIDS`(JSON 배열)의 UID만 허용, 아니면 403
- content_html은 sanitize하지 않음. 크기 상한 2MB(2,000,000자)만 검증
- 이미지: 10MB 제한, 확장자 화이트리스트 jpg/jpeg/png/gif/webp/svg, 파일명 = UUID + 확장자, `BLOG_IMAGE_DIR` 볼륨 저장
- toc 형식: `[{"level": "two"|"three", "text": str, "slug": str}]` (프론트 TOC 컴포넌트가 기대하는 형식). h2→"two", h3→"three". id 없는 제목에는 서버가 kebab-case id를 부여해 content_html에 반영
- 공개 API는 `is_published=true`만 노출. 비발행 글 상세는 404
- 조회수 증가는 원자적 UPDATE (`view_count = view_count + 1`)
- slug 중복 생성 409, 없는 slug 404
- 모든 커밋 전 `pytest` 통과 (E2E 제외 기본 실행)
- 실행 위치: `C:\dev\funq\backend-api` (feature branch `feat/blog-domain`, 필요 시 worktree)

---

## Pre-flight

- [ ] `git status` clean 확인, `main` 최신화
- [ ] `git checkout -b feat/blog-domain`
- [ ] 로컬 실행 가능 확인: `docker compose up -d` 후 `docker exec backend-api-dev pytest` 통과 (baseline)

---

## File Structure

| Path | Action | Task |
|---|---|---|
| `requirements.txt` | modify (+beautifulsoup4) | 2 |
| `app/models/blog.py` | create | 1 |
| `app/models/__init__.py` | modify | 1 |
| `alembic/versions/xxxx_add_blog_posts.py` | generate | 1 |
| `app/services/blog/__init__.py` | create | 2 |
| `app/services/blog/content.py` | create (순수 함수: TOC/리딩타임) | 2 |
| `app/schemas/blog.py` | create | 3 |
| `app/schemas/__init__.py` | modify | 3 |
| `app/services/blog/protocol.py` | create | 4 |
| `app/services/blog/service.py` | create | 4 |
| `app/services/blog/images.py` | create | 7 |
| `app/services/blog/dependencies.py` | create | 4, 7 |
| `app/dependencies/blog_admin.py` | create | 5 |
| `app/dependencies/__init__.py` | modify | 5 |
| `app/config/settings.py` | modify (+blog_admin_uids, +blog_image_dir) | 5, 7 |
| `app/routers/blog/__init__.py` | create | 6 |
| `app/routers/blog/posts.py` | create | 6 (공개), 6b (관리자) |
| `app/routers/blog/images.py` | create | 7 |
| `app/main.py` | modify (라우터 등록) | 6 |
| `tests/unit/services/test_blog_content.py` | create | 2 |
| `tests/fakes/fake_blog.py` | create | 6 |
| `tests/fakes/__init__.py` | modify | 6 |
| `tests/conftest.py` | modify (blog fixtures) | 6 |
| `tests/integration/test_blog_posts.py` | create | 6, 6b |
| `tests/integration/test_blog_images.py` | create | 7 |
| `docker-compose.yml` / `docker-compose.prod.yml` | modify (이미지 볼륨) | 8 |
| `.env.example` | modify | 8 |
| `CLAUDE.md` | modify (blog 도메인 문서) | 8 |

---

### Task 1: BlogPost 모델 + Alembic 마이그레이션

**Files:**
- Create: `app/models/blog.py`
- Modify: `app/models/__init__.py`
- Generate: `alembic/versions/*_add_blog_posts.py`

**Interfaces:**
- Produces: `BlogPost` SQLAlchemy 모델 (후속 태스크의 서비스가 import)

- [ ] **Step 1: 모델 작성** — `app/models/blog.py`:

```python
"""블로그 데이터베이스 모델"""

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import String, Boolean, Text, Integer, DateTime, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.external.database import Base


class BlogPost(Base):
    """블로그 글 (HTML 본문 + 메타데이터 + 조회수)"""
    __tablename__ = "blog_posts"
    __table_args__ = (
        Index("ix_blog_posts_published_at", "published_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    slug: Mapped[str] = mapped_column(String(200), unique=True, nullable=False)
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    author: Mapped[str] = mapped_column(String(100), nullable=False, default="fundev")
    content_html: Mapped[str] = mapped_column(Text, nullable=False)
    cover_image_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    tags: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    toc: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    reading_time_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    view_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_published: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    published_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=datetime.utcnow
    )
```

- [ ] **Step 2: `app/models/__init__.py`에 import 추가** (기존 calendar import 유지):

```python
from app.models.blog import BlogPost
```

`__all__`이 있으면 `"BlogPost"` 추가.

- [ ] **Step 3: 마이그레이션 생성**

```bash
docker exec backend-api-dev alembic revision --autogenerate -m "add blog_posts table"
```

생성된 파일을 열어 `blog_posts` 테이블 생성 + `ix_blog_posts_published_at` 인덱스만 포함됐는지 검토 (다른 테이블 변경이 섞이면 STOP — 모델 정의 오류).

- [ ] **Step 4: 마이그레이션 적용 + 확인**

```bash
docker exec backend-api-dev alembic upgrade head
docker exec backend-api-dev python -c "from app.models import BlogPost; print(BlogPost.__tablename__)"
```

Expected: `blog_posts` 출력, 에러 없음.

- [ ] **Step 5: pytest 통과 확인 후 커밋**

```bash
docker exec backend-api-dev pytest
git add app/models/ alembic/versions/
git commit -m "feat: add BlogPost model and migration"
```

---

### Task 2: 콘텐츠 처리 유틸 (TOC 추출 + id 부여 + 리딩타임)

**Files:**
- Modify: `requirements.txt` (+`beautifulsoup4==4.12.3`)
- Create: `app/services/blog/__init__.py` (빈 파일 → Task 4에서 export 추가)
- Create: `app/services/blog/content.py`
- Test: `tests/unit/services/test_blog_content.py`

**Interfaces:**
- Produces:
  - `process_content(html: str) -> ProcessedContent` — `ProcessedContent`는 `content_html: str`(id 부여 반영), `toc: list[dict]`, `reading_time_minutes: int` 필드의 dataclass
  - Task 4의 서비스가 저장 시 호출

- [ ] **Step 1: 의존성 추가**

`requirements.txt`에 `beautifulsoup4==4.12.3` 추가 후:

```bash
docker compose up -d --build
```

- [ ] **Step 2: 실패하는 테스트 작성** — `tests/unit/services/test_blog_content.py`:

```python
"""블로그 콘텐츠 처리 유틸 테스트"""

from app.services.blog.content import process_content


class TestProcessContent:
    def test_extracts_toc_from_h2_h3(self):
        html = '<h2 id="intro">소개</h2><p>본문</p><h3 id="detail">상세</h3>'
        result = process_content(html)
        assert result.toc == [
            {"level": "two", "text": "소개", "slug": "intro"},
            {"level": "three", "text": "상세", "slug": "detail"},
        ]

    def test_injects_id_when_missing(self):
        html = "<h2>My Heading</h2>"
        result = process_content(html)
        assert result.toc[0]["slug"] == "my-heading"
        assert 'id="my-heading"' in result.content_html

    def test_korean_heading_id(self):
        html = "<h2>시작하기</h2>"
        result = process_content(html)
        assert result.toc[0]["slug"] == "시작하기"
        assert 'id="시작하기"' in result.content_html

    def test_duplicate_headings_get_unique_ids(self):
        html = "<h2>Setup</h2><h2>Setup</h2>"
        result = process_content(html)
        slugs = [t["slug"] for t in result.toc]
        assert slugs == ["setup", "setup-1"]

    def test_existing_ids_preserved(self):
        html = '<h2 id="custom-id">제목</h2>'
        result = process_content(html)
        assert result.toc[0]["slug"] == "custom-id"
        assert result.content_html == html

    def test_style_and_h1_ignored_in_toc(self):
        html = "<style>.post-body h2 { color: red; }</style><h1>타이틀</h1><h2>섹션</h2>"
        result = process_content(html)
        assert len(result.toc) == 1
        assert result.toc[0]["text"] == "섹션"

    def test_reading_time_minimum_one_minute(self):
        result = process_content("<p>짧은 글</p>")
        assert result.reading_time_minutes == 1

    def test_reading_time_scales_with_length(self):
        long_text = "<p>" + ("word " * 1000) + "</p>"
        result = process_content(long_text)
        assert result.reading_time_minutes == 5  # 1000 words / 200 wpm
```

- [ ] **Step 3: 실패 확인**

```bash
docker exec backend-api-dev pytest tests/unit/services/test_blog_content.py -v
```

Expected: FAIL (ModuleNotFoundError).

- [ ] **Step 4: 구현** — `app/services/blog/content.py`:

```python
"""블로그 콘텐츠 처리 — TOC 추출, 제목 id 부여, 리딩타임 계산 (순수 함수)"""

import math
import re
from dataclasses import dataclass

from bs4 import BeautifulSoup

WORDS_PER_MINUTE = 200


@dataclass
class ProcessedContent:
    content_html: str
    toc: list[dict]
    reading_time_minutes: int


def _slugify(text: str) -> str:
    """github-slugger 규칙 근사: 소문자화, 공백→하이픈, 유니코드 문자 보존"""
    slug = text.strip().lower()
    slug = re.sub(r"[^\w\s가-힣-]", "", slug, flags=re.UNICODE)
    slug = re.sub(r"\s+", "-", slug)
    return slug or "section"


def process_content(html: str) -> ProcessedContent:
    soup = BeautifulSoup(html, "html.parser")

    toc: list[dict] = []
    used_ids: dict[str, int] = {}
    changed = False

    for heading in soup.find_all(["h2", "h3"]):
        # <style> 내부 텍스트는 find_all 대상이 아니므로 별도 처리 불필요
        text = heading.get_text(strip=True)
        heading_id = heading.get("id")
        if not heading_id:
            base = _slugify(text)
            count = used_ids.get(base, 0)
            heading_id = base if count == 0 else f"{base}-{count}"
            used_ids[base] = count + 1
            heading["id"] = heading_id
            changed = True
        else:
            used_ids.setdefault(heading_id, 1)
        toc.append({
            "level": "two" if heading.name == "h2" else "three",
            "text": text,
            "slug": heading_id,
        })

    # id 미부여 시 원본 그대로 반환 (불필요한 재직렬화로 인한 포맷 변형 방지)
    content_html = str(soup) if changed else html

    for style in soup.find_all("style"):
        style.decompose()
    plain_text = soup.get_text(separator=" ", strip=True)
    word_count = len(plain_text.split())
    reading_time = max(1, math.ceil(word_count / WORDS_PER_MINUTE))

    return ProcessedContent(
        content_html=content_html,
        toc=toc,
        reading_time_minutes=reading_time,
    )
```

주의: `str(soup)` 재직렬화는 id 부여가 실제로 발생한 경우에만 수행 (`changed` 플래그). 리딩타임 계산용 `<style>` 제거는 TOC/직렬화 이후에 수행한다 (순서 중요 — decompose가 content_html에 반영되면 안 됨).

`app/services/blog/__init__.py`는 빈 파일로 생성.

- [ ] **Step 5: 테스트 통과 확인**

```bash
docker exec backend-api-dev pytest tests/unit/services/test_blog_content.py -v
```

Expected: 전체 PASS. `test_duplicate_headings_get_unique_ids`가 실패하면 slug 카운터 로직 확인.

- [ ] **Step 6: 커밋**

```bash
git add requirements.txt app/services/blog/ tests/unit/services/test_blog_content.py
git commit -m "feat: add blog content processing (TOC extraction, heading ids, reading time)"
```

---

### Task 3: Pydantic 스키마

**Files:**
- Create: `app/schemas/blog.py`
- Modify: `app/schemas/__init__.py`

**Interfaces:**
- Produces (라우터·서비스·테스트가 사용):
  - `BlogPostCreate` — slug, title, description, content_html 필수; author("fundev"), cover_image_url(None), tags([]), is_published(True), published_at(None→서버가 now) 옵션
  - `BlogPostUpdate` — 모든 필드 Optional (부분 수정)
  - `BlogPostSummary` — 목록용 (content_html/toc 제외)
  - `BlogPostDetail` — Summary + content_html, toc, is_published
  - `ViewCountResponse` — `{view_count: int}`
  - `ImageUploadResponse` — `{url: str, filename: str}`

- [ ] **Step 1: 스키마 작성** — `app/schemas/blog.py`:

```python
"""블로그 API 스키마"""

import re
from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, field_validator

MAX_CONTENT_LENGTH = 2_000_000  # 2MB 상당
SLUG_PATTERN = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


def validate_content_size(v: str) -> str:
    if len(v) > MAX_CONTENT_LENGTH:
        raise ValueError(f"content_html exceeds {MAX_CONTENT_LENGTH} characters")
    return v


class BlogPostCreate(BaseModel):
    slug: str
    title: str
    description: str
    content_html: str
    author: str = "fundev"
    cover_image_url: Optional[str] = None
    tags: list[str] = []
    is_published: bool = True
    published_at: Optional[datetime] = None  # None이면 서버가 현재 시각

    @field_validator("slug")
    @classmethod
    def slug_format(cls, v: str) -> str:
        if not SLUG_PATTERN.match(v):
            raise ValueError("slug must be kebab-case (a-z, 0-9, hyphen)")
        return v

    @field_validator("content_html")
    @classmethod
    def content_size(cls, v: str) -> str:
        return validate_content_size(v)


class BlogPostUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    content_html: Optional[str] = None
    author: Optional[str] = None
    cover_image_url: Optional[str] = None
    tags: Optional[list[str]] = None
    is_published: Optional[bool] = None
    published_at: Optional[datetime] = None

    @field_validator("content_html")
    @classmethod
    def content_size(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        return validate_content_size(v)


class BlogPostSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    slug: str
    title: str
    description: str
    author: str
    cover_image_url: Optional[str]
    tags: list[str]
    reading_time_minutes: int
    view_count: int
    published_at: datetime
    updated_at: datetime


class BlogPostDetail(BlogPostSummary):
    content_html: str
    toc: list[dict]
    is_published: bool


class ViewCountResponse(BaseModel):
    view_count: int


class ImageUploadResponse(BaseModel):
    url: str
    filename: str
```

- [ ] **Step 2: `app/schemas/__init__.py`에 export 추가**

```python
from app.schemas.blog import (
    BlogPostCreate,
    BlogPostUpdate,
    BlogPostSummary,
    BlogPostDetail,
    ViewCountResponse,
    ImageUploadResponse,
)
```

- [ ] **Step 3: import 검증 + 커밋**

```bash
docker exec backend-api-dev python -c "from app.schemas import BlogPostCreate; print('ok')"
docker exec backend-api-dev pytest
git add app/schemas/
git commit -m "feat: add blog API schemas"
```

---

### Task 4: BlogService (Protocol + 구현 + DI)

**Files:**
- Create: `app/services/blog/protocol.py`
- Create: `app/services/blog/service.py`
- Create: `app/services/blog/dependencies.py`
- Modify: `app/services/blog/__init__.py`

**Interfaces:**
- Consumes: `BlogPost`(Task 1), `process_content`(Task 2), 스키마(Task 3)
- Produces: `BlogServiceProtocol` / `BlogService` / `get_blog_service` — 메서드 시그니처:
  - `list_published(tag: str | None, page: int, size: int) -> list[BlogPost]`
  - `list_all() -> list[BlogPost]`
  - `get_published(slug: str) -> BlogPost` (없거나 비발행 → HTTPException 404)
  - `get_any(slug: str) -> BlogPost` (없으면 404 — 관리자용)
  - `create(data: BlogPostCreate) -> BlogPost` (slug 중복 → 409)
  - `update(slug: str, data: BlogPostUpdate) -> BlogPost` (없으면 404)
  - `delete(slug: str) -> None` (없으면 404)
  - `increment_view(slug: str) -> int` (없으면 404, 새 view_count 반환)

서비스는 Fake로 대체되어 integration 테스트되므로 이 태스크는 구현+import 검증까지, 동작 검증은 Task 6 integration 테스트에서 수행 (기존 calendar 서비스와 동일한 패턴).

- [ ] **Step 1: Protocol 작성** — `app/services/blog/protocol.py`:

```python
"""블로그 서비스 프로토콜"""

from typing import Protocol

from app.models.blog import BlogPost
from app.schemas.blog import BlogPostCreate, BlogPostUpdate


class BlogServiceProtocol(Protocol):
    def list_published(self, tag: str | None, page: int, size: int) -> list[BlogPost]: ...
    def list_all(self) -> list[BlogPost]: ...
    def get_published(self, slug: str) -> BlogPost: ...
    def get_any(self, slug: str) -> BlogPost: ...
    def create(self, data: BlogPostCreate) -> BlogPost: ...
    def update(self, slug: str, data: BlogPostUpdate) -> BlogPost: ...
    def delete(self, slug: str) -> None: ...
    def increment_view(self, slug: str) -> int: ...
```

- [ ] **Step 2: 구현 작성** — `app/services/blog/service.py`:

```python
"""블로그 서비스 구현"""

from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy import update
from sqlalchemy.orm import Session

from app.models.blog import BlogPost
from app.schemas.blog import BlogPostCreate, BlogPostUpdate
from app.services.blog.content import process_content


class BlogService:
    def __init__(self, db: Session):
        self.db = db

    def list_published(self, tag: str | None = None, page: int = 1, size: int = 100) -> list[BlogPost]:
        query = self.db.query(BlogPost).filter(BlogPost.is_published.is_(True))
        if tag:
            query = query.filter(BlogPost.tags.contains([tag]))
        return (
            query.order_by(BlogPost.published_at.desc())
            .offset((page - 1) * size)
            .limit(size)
            .all()
        )

    def list_all(self) -> list[BlogPost]:
        return self.db.query(BlogPost).order_by(BlogPost.published_at.desc()).all()

    def get_published(self, slug: str) -> BlogPost:
        post = (
            self.db.query(BlogPost)
            .filter(BlogPost.slug == slug, BlogPost.is_published.is_(True))
            .first()
        )
        if not post:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Post not found")
        return post

    def get_any(self, slug: str) -> BlogPost:
        post = self.db.query(BlogPost).filter(BlogPost.slug == slug).first()
        if not post:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Post not found")
        return post

    def create(self, data: BlogPostCreate) -> BlogPost:
        exists = self.db.query(BlogPost).filter(BlogPost.slug == data.slug).first()
        if exists:
            raise HTTPException(status.HTTP_409_CONFLICT, detail="Slug already exists")

        processed = process_content(data.content_html)
        post = BlogPost(
            slug=data.slug,
            title=data.title,
            description=data.description,
            author=data.author,
            content_html=processed.content_html,
            cover_image_url=data.cover_image_url,
            tags=data.tags,
            toc=processed.toc,
            reading_time_minutes=processed.reading_time_minutes,
            is_published=data.is_published,
            published_at=data.published_at or datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        self.db.add(post)
        self.db.commit()
        self.db.refresh(post)
        return post

    def update(self, slug: str, data: BlogPostUpdate) -> BlogPost:
        post = self.get_any(slug)
        fields = data.model_dump(exclude_unset=True)

        if "content_html" in fields:
            processed = process_content(fields.pop("content_html"))
            post.content_html = processed.content_html
            post.toc = processed.toc
            post.reading_time_minutes = processed.reading_time_minutes

        for key, value in fields.items():
            setattr(post, key, value)

        post.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(post)
        return post

    def delete(self, slug: str) -> None:
        post = self.get_any(slug)
        self.db.delete(post)
        self.db.commit()

    def increment_view(self, slug: str) -> int:
        result = self.db.execute(
            update(BlogPost)
            .where(BlogPost.slug == slug)
            .values(view_count=BlogPost.view_count + 1)
            .returning(BlogPost.view_count)
        )
        row = result.first()
        if row is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Post not found")
        self.db.commit()
        return row[0]
```

- [ ] **Step 3: DI 작성** — `app/services/blog/dependencies.py`:

```python
"""블로그 서비스 의존성 주입"""

from fastapi import Depends
from sqlalchemy.orm import Session

from app.external.database import get_db
from app.services.blog.protocol import BlogServiceProtocol
from app.services.blog.service import BlogService


def get_blog_service(db: Session = Depends(get_db)) -> BlogServiceProtocol:
    """테스트에서 override: app.dependency_overrides[get_blog_service] = lambda: FakeBlogService()"""
    return BlogService(db)
```

- [ ] **Step 4: `app/services/blog/__init__.py` export**

```python
from app.services.blog.protocol import BlogServiceProtocol
from app.services.blog.service import BlogService
from app.services.blog.dependencies import get_blog_service
```

- [ ] **Step 5: import 검증 + 커밋**

```bash
docker exec backend-api-dev python -c "from app.services.blog import get_blog_service; print('ok')"
docker exec backend-api-dev pytest
git add app/services/blog/
git commit -m "feat: add BlogService with protocol and DI"
```

---

### Task 5: 관리자 인증 의존성

**Files:**
- Modify: `app/config/settings.py` (+`blog_admin_uids: list[str] = []`)
- Create: `app/dependencies/blog_admin.py`
- Modify: `app/dependencies/__init__.py`
- Test: `tests/integration/test_blog_admin_auth.py`

**Interfaces:**
- Consumes: `get_current_user`, `FirebaseUser` (기존)
- Produces: `get_blog_admin` — `FirebaseUser` 반환, `settings.blog_admin_uids`에 없는 UID면 403

- [ ] **Step 1: 실패하는 테스트 작성** — `tests/integration/test_blog_admin_auth.py`:

테스트용 임시 보호 라우트는 만들지 않고, Task 6b의 관리자 라우터에서 함께 검증하면 의존성 단위 동작을 직접 테스트한다:

```python
"""블로그 관리자 인증 의존성 테스트"""

import pytest
from fastapi import HTTPException

from app.dependencies.blog_admin import require_blog_admin
from app.dependencies.entities import FirebaseUser


def make_user(uid: str) -> FirebaseUser:
    return FirebaseUser(uid=uid, email="a@b.c", name="t", token_data={"uid": uid})


class TestRequireBlogAdmin:
    def test_admin_uid_passes(self):
        user = make_user("admin-uid")
        result = require_blog_admin(user, admin_uids=["admin-uid"])
        assert result is user

    def test_non_admin_uid_403(self):
        user = make_user("someone-else")
        with pytest.raises(HTTPException) as exc:
            require_blog_admin(user, admin_uids=["admin-uid"])
        assert exc.value.status_code == 403

    def test_empty_admin_list_403(self):
        user = make_user("any")
        with pytest.raises(HTTPException) as exc:
            require_blog_admin(user, admin_uids=[])
        assert exc.value.status_code == 403
```

- [ ] **Step 2: 실패 확인**

```bash
docker exec backend-api-dev pytest tests/integration/test_blog_admin_auth.py -v
```

Expected: FAIL (ModuleNotFoundError).

- [ ] **Step 3: settings 필드 추가** — `app/config/settings.py`의 Settings 클래스에:

```python
    # Blog
    blog_admin_uids: list[str] = []
    blog_image_dir: str = "data/blog-images"
```

(`blog_image_dir`은 Task 7에서 사용하지만 settings 변경을 한 번에 처리)

- [ ] **Step 4: 의존성 구현** — `app/dependencies/blog_admin.py`:

```python
"""블로그 관리자 인증 의존성"""

from fastapi import Depends, HTTPException, status

from app.config import get_settings
from app.dependencies.auth import get_current_user
from app.dependencies.entities import FirebaseUser


def require_blog_admin(user: FirebaseUser, admin_uids: list[str]) -> FirebaseUser:
    """순수 함수 — 테스트 용이성을 위해 분리"""
    if user.uid not in admin_uids:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Blog admin privileges required",
        )
    return user


def get_blog_admin(
    user: FirebaseUser = Depends(get_current_user),
) -> FirebaseUser:
    """
    Usage:
        @router.post("/posts")
        def create(user: FirebaseUser = Depends(get_blog_admin)):
            ...
    """
    settings = get_settings()
    return require_blog_admin(user, settings.blog_admin_uids)
```

`app/dependencies/__init__.py`에 `get_blog_admin` export 추가 (기존 export 유지).

- [ ] **Step 5: 테스트 통과 + 커밋**

```bash
docker exec backend-api-dev pytest tests/integration/test_blog_admin_auth.py -v
docker exec backend-api-dev pytest
git add app/config/settings.py app/dependencies/ tests/integration/test_blog_admin_auth.py
git commit -m "feat: add blog admin auth dependency (BLOG_ADMIN_UIDS)"
```

---

### Task 6: 공개 라우터 (목록/상세/조회수) + Fake + conftest

**Files:**
- Create: `app/routers/blog/__init__.py`, `app/routers/blog/posts.py`
- Modify: `app/main.py`
- Create: `tests/fakes/fake_blog.py`
- Modify: `tests/fakes/__init__.py`, `tests/conftest.py`
- Test: `tests/integration/test_blog_posts.py`

**Interfaces:**
- Consumes: `BlogServiceProtocol`, `get_blog_service`(Task 4), 스키마(Task 3)
- Produces:
  - 라우트: `GET /blog/posts`, `GET /blog/posts/{slug}`, `POST /blog/posts/{slug}/view`
  - `FakeBlogService` — 인메모리 구현, 헬퍼 `add_post(slug, title="제목", is_published=True, tags=None, content_html="<p>본문</p>") -> BlogPost 유사 객체`
  - conftest fixture: `fake_blog_service`, `client_with_fake_blog_service`(인증 불필요 공개용), `client_with_fake_blog_admin`(Task 6b용 — fake 서비스 + get_blog_admin override)

- [ ] **Step 1: 실패하는 integration 테스트 작성** — `tests/integration/test_blog_posts.py`:

```python
"""Blog Posts API 통합 테스트 (공개 엔드포인트)"""


class TestPublicPosts:
    def test_list_empty(self, client_with_fake_blog_service):
        response = client_with_fake_blog_service.get("/blog/posts")
        assert response.status_code == 200
        assert response.json() == []

    def test_list_excludes_unpublished(self, client_with_fake_blog_service, fake_blog_service):
        fake_blog_service.add_post("published-post")
        fake_blog_service.add_post("draft-post", is_published=False)
        response = client_with_fake_blog_service.get("/blog/posts")
        slugs = [p["slug"] for p in response.json()]
        assert slugs == ["published-post"]

    def test_list_summary_has_no_content_html(self, client_with_fake_blog_service, fake_blog_service):
        fake_blog_service.add_post("a-post")
        body = client_with_fake_blog_service.get("/blog/posts").json()
        assert "content_html" not in body[0]
        assert body[0]["title"] == "제목"

    def test_list_filter_by_tag(self, client_with_fake_blog_service, fake_blog_service):
        fake_blog_service.add_post("tagged", tags=["nextjs"])
        fake_blog_service.add_post("other", tags=["python"])
        body = client_with_fake_blog_service.get("/blog/posts?tag=nextjs").json()
        assert [p["slug"] for p in body] == ["tagged"]

    def test_detail_returns_content_and_toc(self, client_with_fake_blog_service, fake_blog_service):
        fake_blog_service.add_post("my-post", content_html='<h2 id="s">섹션</h2>')
        body = client_with_fake_blog_service.get("/blog/posts/my-post").json()
        assert body["content_html"] == '<h2 id="s">섹션</h2>'
        assert body["toc"] == [{"level": "two", "text": "섹션", "slug": "s"}]

    def test_detail_unpublished_404(self, client_with_fake_blog_service, fake_blog_service):
        fake_blog_service.add_post("draft", is_published=False)
        response = client_with_fake_blog_service.get("/blog/posts/draft")
        assert response.status_code == 404

    def test_detail_missing_404(self, client_with_fake_blog_service):
        response = client_with_fake_blog_service.get("/blog/posts/nope")
        assert response.status_code == 404

    def test_view_increments(self, client_with_fake_blog_service, fake_blog_service):
        fake_blog_service.add_post("viewed")
        r1 = client_with_fake_blog_service.post("/blog/posts/viewed/view")
        r2 = client_with_fake_blog_service.post("/blog/posts/viewed/view")
        assert r1.json() == {"view_count": 1}
        assert r2.json() == {"view_count": 2}

    def test_view_missing_404(self, client_with_fake_blog_service):
        response = client_with_fake_blog_service.post("/blog/posts/nope/view")
        assert response.status_code == 404
```

- [ ] **Step 2: 실패 확인**

```bash
docker exec backend-api-dev pytest tests/integration/test_blog_posts.py -v
```

Expected: FAIL (fixture 없음 → conftest 에러).

- [ ] **Step 3: FakeBlogService 작성** — `tests/fakes/fake_blog.py`:

```python
"""블로그 서비스 Fake 구현"""

import uuid
from datetime import datetime
from types import SimpleNamespace

from fastapi import HTTPException

from app.schemas.blog import BlogPostCreate, BlogPostUpdate
from app.services.blog.content import process_content


class FakeBlogService:
    def __init__(self):
        self.posts: dict[str, SimpleNamespace] = {}

    def add_post(self, slug, title="제목", is_published=True, tags=None,
                 content_html="<p>본문</p>", description="설명"):
        """테스트 헬퍼 — process_content를 거쳐 실제 서비스와 동일한 toc 생성"""
        processed = process_content(content_html)
        post = SimpleNamespace(
            id=uuid.uuid4(),
            slug=slug,
            title=title,
            description=description,
            author="fundev",
            content_html=processed.content_html,
            cover_image_url=None,
            tags=tags or [],
            toc=processed.toc,
            reading_time_minutes=processed.reading_time_minutes,
            view_count=0,
            is_published=is_published,
            published_at=datetime(2026, 1, 1),
            updated_at=datetime(2026, 1, 1),
        )
        self.posts[slug] = post
        return post

    def list_published(self, tag=None, page=1, size=100):
        posts = [p for p in self.posts.values() if p.is_published]
        if tag:
            posts = [p for p in posts if tag in p.tags]
        posts.sort(key=lambda p: p.published_at, reverse=True)
        return posts[(page - 1) * size : page * size]

    def list_all(self):
        return sorted(self.posts.values(), key=lambda p: p.published_at, reverse=True)

    def get_published(self, slug):
        post = self.posts.get(slug)
        if not post or not post.is_published:
            raise HTTPException(404, detail="Post not found")
        return post

    def get_any(self, slug):
        post = self.posts.get(slug)
        if not post:
            raise HTTPException(404, detail="Post not found")
        return post

    def create(self, data: BlogPostCreate):
        if data.slug in self.posts:
            raise HTTPException(409, detail="Slug already exists")
        post = self.add_post(
            data.slug, title=data.title, is_published=data.is_published,
            tags=data.tags, content_html=data.content_html, description=data.description,
        )
        if data.published_at:
            post.published_at = data.published_at
        post.author = data.author
        post.cover_image_url = data.cover_image_url
        return post

    def update(self, slug, data: BlogPostUpdate):
        post = self.get_any(slug)
        fields = data.model_dump(exclude_unset=True)
        if "content_html" in fields:
            processed = process_content(fields.pop("content_html"))
            post.content_html = processed.content_html
            post.toc = processed.toc
            post.reading_time_minutes = processed.reading_time_minutes
        for key, value in fields.items():
            setattr(post, key, value)
        post.updated_at = datetime.utcnow()
        return post

    def delete(self, slug):
        self.get_any(slug)
        del self.posts[slug]

    def increment_view(self, slug):
        post = self.get_any(slug)
        post.view_count += 1
        return post.view_count
```

`tests/fakes/__init__.py`에 `from tests.fakes.fake_blog import FakeBlogService` 추가.

- [ ] **Step 4: conftest fixture 추가** — `tests/conftest.py` 하단에:

```python
# Blog Service Fixtures

from app.services.blog.dependencies import get_blog_service
from app.dependencies.blog_admin import get_blog_admin
from tests.fakes import FakeBlogService


@pytest.fixture
def fake_blog_service():
    """Fake Blog 서비스"""
    return FakeBlogService()


@pytest.fixture
def client_with_fake_blog_service(fake_blog_service):
    """Blog 서비스가 Fake로 대체된 테스트 클라이언트 (공개 엔드포인트용, 인증 없음)"""
    app.dependency_overrides[get_blog_service] = lambda: fake_blog_service
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


@pytest.fixture
def client_with_fake_blog_admin(fake_blog_service, fake_user):
    """Blog 서비스 Fake + 관리자 인증 통과 클라이언트"""
    app.dependency_overrides[get_blog_service] = lambda: fake_blog_service
    app.dependency_overrides[get_blog_admin] = lambda: fake_user
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()
```

- [ ] **Step 5: 라우터 작성** — `app/routers/blog/posts.py` (공개 부분):

```python
"""블로그 글 API"""

from fastapi import APIRouter, Depends, Query, status

from app.dependencies import get_blog_admin
from app.dependencies.entities import FirebaseUser
from app.schemas import (
    BlogPostCreate,
    BlogPostUpdate,
    BlogPostSummary,
    BlogPostDetail,
    ViewCountResponse,
)
from app.services.blog import BlogServiceProtocol, get_blog_service

router = APIRouter(prefix="/posts", tags=["blog"])


@router.get("", response_model=list[BlogPostSummary])
def list_posts(
    tag: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    size: int = Query(default=100, ge=1, le=1000),
    service: BlogServiceProtocol = Depends(get_blog_service),
):
    """발행된 글 목록 (본문 제외)"""
    return service.list_published(tag=tag, page=page, size=size)


@router.get("/{slug}", response_model=BlogPostDetail)
def get_post(
    slug: str,
    service: BlogServiceProtocol = Depends(get_blog_service),
):
    """글 상세 (발행된 글만)"""
    return service.get_published(slug)


@router.post("/{slug}/view", response_model=ViewCountResponse)
def increment_view(
    slug: str,
    service: BlogServiceProtocol = Depends(get_blog_service),
):
    """조회수 +1"""
    return ViewCountResponse(view_count=service.increment_view(slug))
```

`app/routers/blog/__init__.py`:

```python
"""블로그 라우터 통합"""

from fastapi import APIRouter

from app.routers.blog import posts

router = APIRouter(prefix="/blog")
router.include_router(posts.router)
```

- [ ] **Step 6: main.py 등록** — `app/main.py`:

```python
from app.routers.blog import router as blog_router
# ...
app.include_router(blog_router)
```

- [ ] **Step 7: 테스트 통과 확인**

```bash
docker exec backend-api-dev pytest tests/integration/test_blog_posts.py -v
docker exec backend-api-dev pytest
```

Expected: 전체 PASS.

- [ ] **Step 8: 커밋**

```bash
git add app/routers/ app/main.py tests/
git commit -m "feat: add public blog posts API (list, detail, view count)"
```

---

### Task 6b: 관리자 라우터 (생성/수정/삭제/전체 목록)

**Files:**
- Modify: `app/routers/blog/posts.py` (관리자 엔드포인트 추가)
- Modify: `tests/integration/test_blog_posts.py` (관리자 테스트 추가)

**Interfaces:**
- Consumes: `get_blog_admin`(Task 5), `client_with_fake_blog_admin` fixture(Task 6)
- Produces: `POST /blog/posts`, `PUT /blog/posts/{slug}`, `DELETE /blog/posts/{slug}`, `GET /blog/admin/posts`

- [ ] **Step 1: 실패하는 테스트 추가** — `tests/integration/test_blog_posts.py`에 클래스 추가:

```python
class TestAdminPosts:
    def test_create_requires_auth(self, client):
        response = client.post("/blog/posts", json={})
        assert response.status_code == 403  # HTTPBearer가 자격 증명 없음 거부

    def test_create_success(self, client_with_fake_blog_admin):
        response = client_with_fake_blog_admin.post(
            "/blog/posts",
            json={
                "slug": "new-post",
                "title": "새 글",
                "description": "설명",
                "content_html": "<h2>섹션</h2><p>본문</p>",
                "tags": ["test"],
            },
        )
        assert response.status_code == 201
        body = response.json()
        assert body["slug"] == "new-post"
        assert body["toc"] == [{"level": "two", "text": "섹션", "slug": "섹션"}]

    def test_create_duplicate_slug_409(self, client_with_fake_blog_admin, fake_blog_service):
        fake_blog_service.add_post("existing")
        response = client_with_fake_blog_admin.post(
            "/blog/posts",
            json={"slug": "existing", "title": "t", "description": "d", "content_html": "<p>x</p>"},
        )
        assert response.status_code == 409

    def test_create_invalid_slug_422(self, client_with_fake_blog_admin):
        response = client_with_fake_blog_admin.post(
            "/blog/posts",
            json={"slug": "Invalid Slug!", "title": "t", "description": "d", "content_html": "<p>x</p>"},
        )
        assert response.status_code == 422

    def test_update_success(self, client_with_fake_blog_admin, fake_blog_service):
        fake_blog_service.add_post("target")
        response = client_with_fake_blog_admin.put(
            "/blog/posts/target", json={"title": "수정된 제목"}
        )
        assert response.status_code == 200
        assert response.json()["title"] == "수정된 제목"

    def test_update_content_recomputes_toc(self, client_with_fake_blog_admin, fake_blog_service):
        fake_blog_service.add_post("target")
        response = client_with_fake_blog_admin.put(
            "/blog/posts/target", json={"content_html": '<h2 id="new">새 섹션</h2>'}
        )
        assert response.json()["toc"] == [{"level": "two", "text": "새 섹션", "slug": "new"}]

    def test_update_missing_404(self, client_with_fake_blog_admin):
        response = client_with_fake_blog_admin.put("/blog/posts/nope", json={"title": "x"})
        assert response.status_code == 404

    def test_delete_success(self, client_with_fake_blog_admin, fake_blog_service):
        fake_blog_service.add_post("doomed")
        response = client_with_fake_blog_admin.delete("/blog/posts/doomed")
        assert response.status_code == 204
        assert "doomed" not in fake_blog_service.posts

    def test_admin_list_includes_unpublished(self, client_with_fake_blog_admin, fake_blog_service):
        fake_blog_service.add_post("pub")
        fake_blog_service.add_post("draft", is_published=False)
        response = client_with_fake_blog_admin.get("/blog/admin/posts")
        slugs = {p["slug"] for p in response.json()}
        assert slugs == {"pub", "draft"}

    def test_admin_list_requires_auth(self, client):
        response = client.get("/blog/admin/posts")
        assert response.status_code == 403

    def test_admin_detail_includes_unpublished(self, client_with_fake_blog_admin, fake_blog_service):
        fake_blog_service.add_post("draft", is_published=False)
        response = client_with_fake_blog_admin.get("/blog/admin/posts/draft")
        assert response.status_code == 200
        assert response.json()["slug"] == "draft"
        assert "content_html" in response.json()

    def test_admin_detail_requires_auth(self, client):
        response = client.get("/blog/admin/posts/any")
        assert response.status_code == 403
```

- [ ] **Step 2: 실패 확인**

```bash
docker exec backend-api-dev pytest tests/integration/test_blog_posts.py::TestAdminPosts -v
```

Expected: 405/404류 FAIL (라우트 없음).

- [ ] **Step 3: 라우터에 관리자 엔드포인트 추가** — `app/routers/blog/posts.py`에 추가:

```python
@router.post("", response_model=BlogPostDetail, status_code=status.HTTP_201_CREATED)
def create_post(
    data: BlogPostCreate,
    user: FirebaseUser = Depends(get_blog_admin),
    service: BlogServiceProtocol = Depends(get_blog_service),
):
    """글 생성 (관리자)"""
    return service.create(data)


@router.put("/{slug}", response_model=BlogPostDetail)
def update_post(
    slug: str,
    data: BlogPostUpdate,
    user: FirebaseUser = Depends(get_blog_admin),
    service: BlogServiceProtocol = Depends(get_blog_service),
):
    """글 수정 (관리자)"""
    return service.update(slug, data)


@router.delete("/{slug}", status_code=status.HTTP_204_NO_CONTENT)
def delete_post(
    slug: str,
    user: FirebaseUser = Depends(get_blog_admin),
    service: BlogServiceProtocol = Depends(get_blog_service),
):
    """글 삭제 (관리자)"""
    service.delete(slug)
```

그리고 관리자 목록은 별도 서브라우터로 — `app/routers/blog/__init__.py` 수정:

```python
"""블로그 라우터 통합"""

from fastapi import APIRouter, Depends

from app.dependencies import get_blog_admin
from app.dependencies.entities import FirebaseUser
from app.routers.blog import posts
from app.schemas import BlogPostSummary
from app.services.blog import BlogServiceProtocol, get_blog_service

router = APIRouter(prefix="/blog")
router.include_router(posts.router)


@router.get("/admin/posts", response_model=list[BlogPostSummary], tags=["blog"])
def list_all_posts(
    user: FirebaseUser = Depends(get_blog_admin),
    service: BlogServiceProtocol = Depends(get_blog_service),
):
    """전체 글 목록 — 비발행 포함 (관리자, 에디터 목록 화면용)"""
    return service.list_all()


@router.get("/admin/posts/{slug}", response_model=BlogPostDetail, tags=["blog"])
def get_any_post(
    slug: str,
    user: FirebaseUser = Depends(get_blog_admin),
    service: BlogServiceProtocol = Depends(get_blog_service),
):
    """글 상세 — 비발행 포함 (관리자, 에디터 편집 화면용)"""
    return service.get_any(slug)
```

(`BlogPostDetail`을 `app.schemas` import에 추가)

주의: `GET /blog/posts/{slug}`와 `GET /blog/admin/posts`의 경로 충돌은 없다 (`/blog/admin/posts`는 posts 서브라우터의 `/{slug}` 매칭 대상 아님 — prefix가 다름).

- [ ] **Step 4: 테스트 통과 + 전체 회귀 확인**

```bash
docker exec backend-api-dev pytest tests/integration/test_blog_posts.py -v
docker exec backend-api-dev pytest
```

Expected: 전체 PASS. `test_create_requires_auth`가 401을 반환하면 assert를 403→401로 바꾸지 말 것 — 기존 `test_get_members_requires_auth`와 동일하게 HTTPBearer는 자격 증명 부재 시 403을 반환한다.

- [ ] **Step 5: 커밋**

```bash
git add app/routers/blog/ tests/integration/test_blog_posts.py
git commit -m "feat: add admin blog posts API (create, update, delete, list all)"
```

---

### Task 7: 이미지 업로드/서빙

**Files:**
- Create: `app/services/blog/images.py`
- Modify: `app/services/blog/dependencies.py`, `app/services/blog/__init__.py`
- Create: `app/routers/blog/images.py`
- Modify: `app/routers/blog/__init__.py`
- Test: `tests/integration/test_blog_images.py`

**Interfaces:**
- Consumes: `get_blog_admin`(Task 5), `settings.blog_image_dir`(Task 5에서 추가됨)
- Produces:
  - `ImageStorage` 클래스 — `save(filename: str, content: bytes) -> str`(저장된 파일명 반환), `path_of(filename: str) -> Path | None`(없거나 경로 탈출 시 None)
  - `get_image_storage()` DI
  - 라우트: `POST /blog/images`(관리자), `GET /blog/images/{filename}`(공개)
  - 업로드 응답: `{"url": "/blog/images/<uuid>.<ext>", "filename": "<uuid>.<ext>"}` — url은 상대 경로 (프론트가 `NEXT_PUBLIC_API_URL`과 조합)

- [ ] **Step 1: 실패하는 테스트 작성** — `tests/integration/test_blog_images.py`:

```python
"""Blog Images API 통합 테스트"""

import io

import pytest

from app.services.blog.images import ImageStorage
from app.services.blog.dependencies import get_image_storage
from app.main import app
from fastapi.testclient import TestClient
from app.dependencies.blog_admin import get_blog_admin


@pytest.fixture
def image_storage(tmp_path):
    """임시 디렉터리 기반 이미지 스토리지"""
    return ImageStorage(base_dir=tmp_path)


@pytest.fixture
def client_with_image_storage(image_storage, fake_user):
    app.dependency_overrides[get_image_storage] = lambda: image_storage
    app.dependency_overrides[get_blog_admin] = lambda: fake_user
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


PNG_BYTES = b"\x89PNG\r\n\x1a\n" + b"0" * 100


class TestImageUpload:
    def test_upload_requires_auth(self, client):
        response = client.post("/blog/images")
        assert response.status_code == 403

    def test_upload_success(self, client_with_image_storage):
        response = client_with_image_storage.post(
            "/blog/images",
            files={"file": ("photo.png", io.BytesIO(PNG_BYTES), "image/png")},
        )
        assert response.status_code == 201
        body = response.json()
        assert body["filename"].endswith(".png")
        assert body["url"] == f"/blog/images/{body['filename']}"

    def test_upload_rejects_bad_extension(self, client_with_image_storage):
        response = client_with_image_storage.post(
            "/blog/images",
            files={"file": ("script.exe", io.BytesIO(b"MZ"), "application/octet-stream")},
        )
        assert response.status_code == 400

    def test_upload_rejects_oversize(self, client_with_image_storage):
        big = b"0" * (10 * 1024 * 1024 + 1)
        response = client_with_image_storage.post(
            "/blog/images",
            files={"file": ("big.png", io.BytesIO(big), "image/png")},
        )
        assert response.status_code == 413

    def test_serve_uploaded_image(self, client_with_image_storage):
        upload = client_with_image_storage.post(
            "/blog/images",
            files={"file": ("photo.png", io.BytesIO(PNG_BYTES), "image/png")},
        ).json()
        response = client_with_image_storage.get(upload["url"])
        assert response.status_code == 200
        assert response.content == PNG_BYTES

    def test_serve_missing_404(self, client_with_image_storage):
        response = client_with_image_storage.get("/blog/images/nope.png")
        assert response.status_code == 404

    def test_serve_path_traversal_blocked(self, client_with_image_storage):
        response = client_with_image_storage.get("/blog/images/..%2F..%2Fetc%2Fpasswd")
        assert response.status_code in (404, 400)
```

- [ ] **Step 2: 실패 확인**

```bash
docker exec backend-api-dev pytest tests/integration/test_blog_images.py -v
```

Expected: FAIL (ImportError).

- [ ] **Step 3: 스토리지 구현** — `app/services/blog/images.py`:

```python
"""블로그 이미지 파일 스토리지"""

import uuid
from pathlib import Path

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"}
MAX_IMAGE_BYTES = 10 * 1024 * 1024  # 10MB


class ImageStorage:
    def __init__(self, base_dir: str | Path):
        self.base_dir = Path(base_dir)
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def save(self, original_filename: str, content: bytes) -> str:
        """검증 후 UUID 파일명으로 저장, 저장된 파일명 반환.

        Raises:
            ValueError: 허용되지 않는 확장자
            OversizeError: 크기 초과
        """
        ext = Path(original_filename).suffix.lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise ValueError(f"Extension not allowed: {ext}")
        if len(content) > MAX_IMAGE_BYTES:
            raise OversizeError(f"File exceeds {MAX_IMAGE_BYTES} bytes")

        filename = f"{uuid.uuid4()}{ext}"
        (self.base_dir / filename).write_bytes(content)
        return filename

    def path_of(self, filename: str) -> Path | None:
        """서빙용 경로 반환. 없거나 base_dir 탈출 시 None"""
        candidate = (self.base_dir / filename).resolve()
        if not candidate.is_file():
            return None
        if self.base_dir.resolve() not in candidate.parents:
            return None
        return candidate


class OversizeError(Exception):
    pass
```

- [ ] **Step 4: DI 추가** — `app/services/blog/dependencies.py`에:

```python
from app.config import get_settings
from app.services.blog.images import ImageStorage


def get_image_storage() -> ImageStorage:
    """테스트에서 override: app.dependency_overrides[get_image_storage] = lambda: ImageStorage(tmp)"""
    settings = get_settings()
    return ImageStorage(base_dir=settings.blog_image_dir)
```

`app/services/blog/__init__.py`에 `ImageStorage`, `get_image_storage` export 추가.

- [ ] **Step 5: 라우터 구현** — `app/routers/blog/images.py`:

```python
"""블로그 이미지 API"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from fastapi.responses import FileResponse

from app.dependencies import get_blog_admin
from app.dependencies.entities import FirebaseUser
from app.schemas import ImageUploadResponse
from app.services.blog import ImageStorage, get_image_storage
from app.services.blog.images import OversizeError

router = APIRouter(prefix="/images", tags=["blog"])


@router.post("", response_model=ImageUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_image(
    file: UploadFile,
    user: FirebaseUser = Depends(get_blog_admin),
    storage: ImageStorage = Depends(get_image_storage),
):
    """이미지 업로드 (관리자)"""
    content = await file.read()
    try:
        filename = storage.save(file.filename or "unnamed", content)
    except OversizeError:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="File too large")
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(e))
    return ImageUploadResponse(url=f"/blog/images/{filename}", filename=filename)


@router.get("/{filename}")
def serve_image(
    filename: str,
    storage: ImageStorage = Depends(get_image_storage),
):
    """이미지 서빙 (공개). Nginx 프록시가 캐싱"""
    path = storage.path_of(filename)
    if path is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Image not found")
    return FileResponse(path, headers={"Cache-Control": "public, max-age=31536000, immutable"})
```

`app/routers/blog/__init__.py`에 `router.include_router(images.router)` 추가 (import 포함).

- [ ] **Step 6: 테스트 통과 + 전체 회귀**

```bash
docker exec backend-api-dev pytest tests/integration/test_blog_images.py -v
docker exec backend-api-dev pytest
```

Expected: 전체 PASS.

- [ ] **Step 7: 커밋**

```bash
git add app/services/blog/ app/routers/blog/ tests/integration/test_blog_images.py
git commit -m "feat: add blog image upload and serving"
```

---

### Task 8: 배포 설정 + 문서 + 최종 검증

**Files:**
- Modify: `docker-compose.yml`, `docker-compose.prod.yml` (이미지 볼륨)
- Modify: `.env.example` (+`BLOG_ADMIN_UIDS`)
- Modify: `CLAUDE.md` (blog 도메인 요약)

- [ ] **Step 1: 볼륨 추가**

`docker-compose.yml`의 backend-api 서비스 volumes에 (기존 항목 유지):

```yaml
      - blog-images:/app/data/blog-images
```

최상위 `volumes:` 섹션에 `blog-images:` 추가. `docker-compose.prod.yml`에도 동일 적용.

- [ ] **Step 2: .env.example 갱신**

```bash
# Blog
BLOG_ADMIN_UIDS=["your-firebase-uid"]
BLOG_IMAGE_DIR=data/blog-images
```

- [ ] **Step 3: CLAUDE.md 갱신** — 주요 기능에 "블로그 (blog.funq.kr 콘텐츠 저장소)" 추가, API Endpoints 섹션에 `/blog/*` 엔드포인트 목록 추가 (Task 6/6b/7에서 만든 그대로).

- [ ] **Step 4: 로컬 전체 검증**

```bash
docker compose up -d --build
docker exec backend-api-dev alembic upgrade head
docker exec backend-api-dev pytest
```

수동 스모크 (실 DB 대상 — Fake가 아닌 실제 서비스 경로 검증):

```bash
curl -s http://localhost:8000/blog/posts            # [] 응답
curl -s http://localhost:8000/blog/posts/nope       # 404
curl -s -X POST http://localhost:8000/blog/posts/nope/view   # 404
curl -s -X POST http://localhost:8000/blog/posts    # 403 (인증 없음)
```

- [ ] **Step 5: 커밋 + push + PR**

```bash
git add docker-compose.yml docker-compose.prod.yml .env.example CLAUDE.md
git commit -m "chore: blog domain deployment config and docs"
git push -u origin feat/blog-domain
gh pr create --title "feat: blog domain (posts CRUD, images, views)" --base main \
  --body "블로그 콘텐츠 파이프라인 개편 1단계 — 스펙: blog-nextjs/docs/superpowers/specs/2026-07-25-content-pipeline-design.md"
```

머지 후 기존 CI/CD가 자동 배포. **배포 후 서버에서 1회**: `.env.prod`에 `BLOG_ADMIN_UIDS` 추가 (본인 Firebase UID — Firebase Console > Authentication에서 확인).

---

## Stopping Conditions

1. Alembic autogenerate가 blog_posts 외 다른 테이블 변경을 감지 → STOP (모델/DB 불일치 조사)
2. 기존 테스트(캘린더/AI/auth)가 깨짐 → STOP (회귀)
3. JSONB `tags.contains` 쿼리가 동작하지 않음 → STOP (SQLAlchemy 버전 확인)
