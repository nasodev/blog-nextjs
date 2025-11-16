# Blog Project Architecture & Documentation

> **AI Agent Reference Guide**: This document provides comprehensive analysis of the Next.js blog project for AI development assistance.

**Last Updated**: 2025-11-16
**Next.js Version**: 13.5.8
**Primary Language**: Korean (ko_KR)
**Site URL**: https://blog.funq.kr

---

## Table of Contents

- [Project Overview](#project-overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Routing Architecture](#routing-architecture)
- [Content Management](#content-management)
- [Styling System](#styling-system)
- [Key Components](#key-components)
- [Data Fetching Patterns](#data-fetching-patterns)
- [Configuration Files](#configuration-files)
- [Features](#features)
- [Development Guidelines](#development-guidelines)
- [Improvement Opportunities](#improvement-opportunities)

---

## Project Overview

This is a **production-ready, SEO-optimized blog platform** built with Next.js 13 App Router. The blog focuses on **AI-powered development topics** (AI를 이용한 코딩 개발), featuring posts about Cursor IDE, Supabase, Playwright, SEO, and AI models.

### Current Stats
- **Total Posts**: 11 MDX articles
- **Categories**: Dynamic tag-based system
- **Theme Support**: Dark/Light mode with system preference
- **View Tracking**: Supabase-powered analytics
- **Comments**: Giscus (GitHub Discussions) integration
- **SEO**: Full JSON-LD, Open Graph, sitemap support
- **PWA**: Web app manifest enabled

---

## Tech Stack

### Core Framework
```json
{
  "next": "13.5.8",
  "react": "^18",
  "typescript": "^5"
}
```

### Content Management
- **Contentlayer 0.3.4** - Type-safe MDX content layer
- **next-contentlayer** - Next.js integration
- **remark-gfm** - GitHub Flavored Markdown
- **rehype-slug** - Auto-generate heading IDs
- **rehype-autolink-headings** - Link headings
- **rehype-pretty-code 0.14.0** - Syntax highlighting
- **shiki 1.24.0** - Theme: `github-dark`

### Styling & UI
- **Tailwind CSS 3.3.0** - Utility-first CSS
- **@tailwindcss/typography** - Prose styling
- **@tailwindcss/forms** - Form components
- **PostCSS + Autoprefixer** - CSS processing
- **next/font** - Font optimization (Inter, Manrope)

### Backend & Data
- **Supabase** - View counting database
  - `@supabase/auth-helpers-nextjs 0.10.0`
  - Singleton client pattern
  - RPC functions for atomic operations

### Utilities
- **date-fns 2.30.0** - Date formatting
- **reading-time 1.5.0** - Calculate reading duration
- **github-slugger 2.0.0** - URL slug generation
- **react-hook-form 7.49.1** - Form handling
- **next-sitemap 4.2.3** - Sitemap generation
- **@dotlottie/react-player** - Lottie animations

### Comments System
- **@giscus/react 3.1.0** - GitHub Discussions-based comments
  - Repository: `nasodev/blog-nextjs-comments` (Public)
  - Category: Announcements
  - Mapping: pathname
  - Theme: Synchronized with site theme

### Development Tools
- **Playwright 1.50.1** - E2E testing
- **ESLint** - Linting
- **Prettier** - Code formatting (width: 120, tab: 4)

---

## Project Structure

```
c:\dev\blog-nextjs\
├── app/                          # Next.js App Router
│   ├── layout.tsx               # Root layout (Header, Footer, Theme)
│   ├── page.tsx                 # Home page
│   ├── manifest.ts              # PWA manifest
│   ├── (about)/                 # Route group
│   │   ├── layout.tsx          # Shared About/Contact layout
│   │   ├── about/page.tsx      # About page
│   │   └── contact/page.tsx    # Contact form
│   ├── blogs/
│   │   └── [slug]/page.tsx     # Dynamic blog post (SSG)
│   └── categories/
│       └── [slug]/page.tsx     # Dynamic category page (SSG)
│
├── components/                   # React components
│   ├── Header/                  # Navigation, theme toggle, mobile menu
│   ├── Footer/                  # Newsletter, social links, sitemap
│   ├── Home/                    # Home page sections
│   │   ├── HomeCoverSection.tsx
│   │   ├── FeaturePosts.tsx
│   │   └── RecentPosts.tsx
│   ├── About/                   # About page components
│   │   ├── AboutCoverSection.tsx
│   │   ├── Skills.tsx
│   │   └── InsightRoll.tsx
│   ├── Contact/                 # Contact form components
│   │   ├── ContactForm.tsx
│   │   └── LottieAnimation.tsx
│   ├── Blog/                    # Blog-related components
│   │   ├── BlogLayoutOne.tsx    # Featured post card
│   │   ├── BlogLayoutTwo.tsx    # Medium post card
│   │   ├── BlogLayoutThree.tsx  # Compact post card
│   │   ├── BlogDetails.tsx      # Metadata (date, views, time, tags)
│   │   ├── RenderMdx.tsx        # MDX renderer
│   │   ├── ViewCounter.tsx      # Supabase view counter
│   │   ├── Categories.tsx       # Category pills
│   │   └── Tag.tsx              # Tag badge
│   └── Comments/                # Comment system
│       └── index.tsx            # Giscus integration
│
├── content/                      # MDX blog posts (11 posts)
│   ├── cursor-20250202-v01-cg/
│   │   └── index.mdx
│   ├── supabase-20250202-v01-ds/
│   │   └── index.mdx
│   └── ... (9 more posts)
│
├── lib/                          # Library code
│   └── supabase/                # Supabase integration
│       ├── client.ts            # Singleton client
│       └── api/
│           └── views.ts         # View count API
│
├── utils/                        # Utilities
│   ├── index.tsx                # Helper functions
│   └── siteMetaData.tsx         # Site metadata
│
├── types/                        # TypeScript types
│   └── index.ts                 # Custom type definitions
│
├── public/                       # Static assets
│   ├── images/                  # Blog images
│   ├── animations/              # Lottie files
│   ├── favicon.ico
│   ├── manifest.json
│   └── ... (icons, etc.)
│
├── contentlayer.config.ts       # Contentlayer configuration
├── next.config.js               # Next.js configuration
├── tailwind.config.ts           # Tailwind customization
├── tsconfig.json                # TypeScript configuration
├── next-sitemap.config.js       # Sitemap configuration
├── playwright.config.ts         # E2E test configuration
├── .prettierrc                  # Prettier settings
└── package.json                 # Dependencies
```

---

## Routing Architecture

### App Router Structure

**Static Generation (SSG) with Dynamic Routes:**

#### Home Page
- **Path**: `/`
- **File**: `app/page.tsx`
- **Data**: `allBlogs` from Contentlayer
- **Features**: Featured posts, recent posts grid

#### Blog Post Pages
- **Path**: `/blogs/[slug]`
- **File**: `app/blogs/[slug]/page.tsx`
- **Generation**: `generateStaticParams()` from all MDX files
- **Features**:
  - JSON-LD structured data (NewsArticle)
  - View counter
  - Table of contents
  - Related tags
  - Reading time
  - Code syntax highlighting

#### Category Pages
- **Path**: `/categories/[slug]`
- **File**: `app/categories/[slug]/page.tsx`
- **Generation**: All unique tags + "all" category
- **Features**: Filtered post list, category description

#### About Section
- **Route Group**: `(about)`
- **Shared Layout**: Custom header/footer
- **Pages**:
  - `/about` - Skills, experience, insights
  - `/contact` - Contact form with Lottie animation

### Metadata Generation

All pages implement Next.js 13 `generateMetadata()`:
```typescript
export async function generateMetadata({ params }): Promise<Metadata> {
  // Dynamic title, description, Open Graph, Twitter Cards
}
```

---

## Content Management

### Contentlayer Configuration

**Source**: `content` directory
**Pattern**: `**/**/*.mdx`
**Document Type**: `Blog`

### Frontmatter Schema

```typescript
{
  title: string           // Required - Post title
  publishedAt: date       // Required - Publish date
  updatedAt: date         // Required - Last update
  description: string     // Required - SEO description
  image: {                // Required - Cover image
    filePath: string,
    blurhashDataUrl: string
  }
  isPublished: boolean    // Default: true
  author: string          // Required - Author name
  tags: string[]          // Array of category tags
}
```

### Computed Fields

Automatically generated by Contentlayer:

1. **url**: `string`
   - Generated from `_raw.flattenedPath`
   - Used for routing

2. **readingTime**: `{ text: string, minutes: number, time: number, words: number }`
   - Calculated from `body.raw`
   - Displayed on post cards

3. **toc**: `{ level: string, text: string, slug: string }[]`
   - Extracted from H1-H6 headings
   - Used for table of contents navigation

### MDX Processing Pipeline

```
MDX File
  → remark-gfm (GitHub Flavored Markdown)
  → rehype-slug (Add IDs to headings)
  → rehype-autolink-headings (Link headings)
  → rehype-pretty-code (Syntax highlighting with Shiki)
  → Contentlayer type generation
  → Next.js Static Generation
```

### Content Organization Pattern

```
content/
  [topic]-[date]-[version]-[initials]/
    index.mdx
```

Example:
```
content/cursor-20250202-v01-cg/index.mdx
```

---

## Styling System

### Tailwind Configuration

**File**: `tailwind.config.ts`

#### Dark Mode Strategy
```typescript
darkMode: "class"  // Manual toggle via class
```

#### Custom Theme Colors
```typescript
colors: {
  dark: '#1b1b1b',      // Dark background
  light: '#fff',         // Light background
  accent: '#7B00D3',     // Purple accent (light mode)
  accentDark: '#ffdb4d', // Yellow accent (dark mode)
  gray: '#747474'        // Text gray
}
```

#### Custom Fonts
```typescript
fontFamily: {
  mr: ['var(--font-mr)'],  // Manrope - Primary
  in: ['var(--font-in)']   // Inter - Secondary
}
```

#### Custom Breakpoints
```typescript
screens: {
  xs: '480px',
  sxl: '1180px',
  // ... default Tailwind breakpoints
}
```

#### Custom Animations
```typescript
animation: {
  roll: 'roll 24s linear infinite'
}
keyframes: {
  roll: {
    '0%': { transform: 'translateX(100%)' },
    '100%': { transform: 'translateX(-100%)' }
  }
}
```

#### Plugins
- `@tailwindcss/forms` - Form component styling
- `@tailwindcss/typography` - Prose content (`.prose` class)

### Global Styles

**File**: `app/globals.css`

Key styles:
- Smooth scroll behavior
- Code block syntax highlighting (Shiki)
- Line numbers for code blocks
- Custom scrollbar styles
- Dark mode CSS variables

---

## Key Components

### Layout Components

#### Header (`components/Header/index.tsx`)
**Purpose**: Main navigation and theme toggle
**Features**:
- Logo and site title
- Navigation links (Home, About, Contact)
- Theme switcher (dark/light)
- Social media links (Twitter, GitHub, LinkedIn)
- Mobile hamburger menu
- Sticky positioning

**Key Props**: None (uses site metadata)

#### Footer (`components/Footer/index.tsx`)
**Purpose**: Site footer with newsletter and links
**Features**:
- Newsletter signup form
- Social media links
- Sitemap links (Home, About, Contact, Privacy, Terms)
- Copyright notice

### Blog Components

#### BlogLayoutOne (`components/Blog/BlogLayoutOne.tsx`)
**Purpose**: Large featured post card
**Usage**: Hero section, featured posts
**Features**:
- Full-width image with gradient overlay
- Title, description overlay
- Tags, date, reading time
- Hover animations

**Props**:
```typescript
{ blog: Blog }
```

#### BlogLayoutTwo (`components/Blog/BlogLayoutTwo.tsx`)
**Purpose**: Medium-sized post card
**Usage**: Grid layouts, featured sections
**Features**:
- Image with blur placeholder
- Metadata (date, views, time)
- Tag badges
- Responsive design

**Props**:
```typescript
{ blog: Blog }
```

#### BlogLayoutThree (`components/Blog/BlogLayoutThree.tsx`)
**Purpose**: Compact post card
**Usage**: Category pages, post lists
**Features**:
- Smaller image
- Condensed metadata
- List-friendly layout

**Props**:
```typescript
{ blog: Blog }
```

#### BlogDetails (`components/Blog/BlogDetails.tsx`)
**Purpose**: Post metadata display
**Features**:
- Published date (formatted with date-fns)
- View counter
- Reading time
- Tag list

**Props**:
```typescript
{
  blog: Blog,
  slug: string
}
```

#### RenderMdx (`components/Blog/RenderMdx.tsx`)
**Purpose**: MDX content renderer
**Features**:
- Custom component mapping
- Syntax-highlighted code blocks
- Responsive images
- Typography styling

**Props**:
```typescript
{ blog: Blog }
```

#### ViewCounter (`components/Blog/ViewCounter.tsx`)
**Purpose**: Real-time view count
**Features**:
- Supabase integration
- Auto-increment on mount
- Error handling
- Loading state

**Props**:
```typescript
{ slug: string, showIcon?: boolean }
```

#### Categories (`components/Blog/Categories.tsx`)
**Purpose**: Category navigation
**Features**:
- All tags from published posts
- "All" category option
- Active state styling
- Responsive layout

**Props**:
```typescript
{
  categories: string[],
  currentSlug: string
}
```

#### Tag (`components/Blog/Tag.tsx`)
**Purpose**: Individual tag badge
**Features**:
- Link to category page
- Custom styling
- Hover effects

**Props**:
```typescript
{
  name: string,
  link?: string,
  className?: string
}
```

### Home Components

#### HomeCoverSection (`components/Home/HomeCoverSection.tsx`)
**Purpose**: Hero section with latest post
**Features**:
- Large cover image
- Title and description overlay
- CTA to read post
- Gradient background

**Props**:
```typescript
{ blogs: Blog[] }
```

#### FeaturePosts (`components/Home/FeaturePosts.tsx`)
**Purpose**: Grid of 3 featured posts
**Layout**: 1 large (BlogLayoutOne) + 2 medium (BlogLayoutTwo)
**Props**:
```typescript
{ blogs: Blog[] }
```

#### RecentPosts (`components/Home/RecentPosts.tsx`)
**Purpose**: Recent blog posts list
**Features**:
- Chronologically sorted
- BlogLayoutThree cards
- Responsive grid

**Props**:
```typescript
{ blogs: Blog[] }
```

### About Components

#### AboutCoverSection (`components/About/AboutCoverSection.tsx`)
**Purpose**: About page hero
**Features**:
- Profile image
- Introduction text
- Call-to-action

#### Skills (`components/About/Skills.tsx`)
**Purpose**: Skill tag cloud
**Features**:
- Animated tags
- Responsive layout

#### InsightRoll (`components/About/InsightRoll.tsx`)
**Purpose**: Animated insights ticker
**Features**:
- Infinite scroll animation
- Custom insights list

### Contact Components

#### ContactForm (`components/Contact/ContactForm.tsx`)
**Purpose**: Contact form with validation
**Features**:
- React Hook Form integration
- Email validation
- Submit handling

#### LottieAnimation (`components/Contact/LottieAnimation.tsx`)
**Purpose**: Animated illustration
**Features**:
- Lottie player integration
- Responsive sizing

### Hooks

#### useThemeSwitch (`components/Header/useThemeSwitch.tsx`)
**Purpose**: Theme management
**Features**:
- LocalStorage persistence
- System preference detection
- SSR-safe with `mounted` state
- Dark/light toggle

**Returns**:
```typescript
{
  mode: string,
  setMode: (mode: string) => void
}
```

---

## Data Fetching Patterns

### Static Site Generation (SSG)

All content pages use SSG for optimal performance:

#### Blog Posts
```typescript
// app/blogs/[slug]/page.tsx
export async function generateStaticParams() {
  return allBlogs.map((blog) => ({
    slug: blog._raw.flattenedPath
  }));
}
```

**Build Time**: All blog post pages pre-rendered
**Data Source**: Contentlayer `allBlogs`

#### Category Pages
```typescript
// app/categories/[slug]/page.tsx
export async function generateStaticParams() {
  const categories = allBlogs.flatMap(blog => blog.tags);
  const uniqueCategories = [...new Set(categories)];
  return [
    { slug: 'all' },
    ...uniqueCategories.map(cat => ({ slug: cat }))
  ];
}
```

**Build Time**: One page per unique tag + "all"
**Data Source**: Extracted from blog frontmatter

#### Home Page
```typescript
// app/page.tsx
import { allBlogs } from 'contentlayer/generated';

const sortedBlogs = allBlogs
  .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
  .filter(blog => blog.isPublished);
```

**Build Time**: Single static page
**Data Source**: Direct import from Contentlayer

### Client-Side Data Fetching

#### View Counting (Supabase)

**File**: `lib/supabase/api/views.ts`

```typescript
// Increment view count
export async function incrementViewCount(slug: string) {
  const supabase = getSupabaseClient();
  await supabase.rpc('increment_view_count', { slug_text: slug });
}

// Get current view count
export async function getViewCount(slug: string) {
  const supabase = getSupabaseClient();
  const { data } = await supabase
    .from('views')
    .select('count')
    .eq('slug', slug)
    .single();
  return data?.count ?? 0;
}
```

**Pattern**:
1. Component mounts
2. `useEffect` calls `incrementViewCount()`
3. State updates with new count
4. Display to user

**Error Handling**: Graceful degradation (shows 0 on error)

### Supabase Client Pattern

**File**: `lib/supabase/client.ts`

**Singleton Pattern**:
```typescript
let supabaseClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    supabaseClient = createClientComponentClient();
  }
  return supabaseClient;
}
```

**Benefits**:
- Single connection per client
- Reduced overhead
- Consistent configuration

---

## Configuration Files

### next.config.js

```javascript
const { withContentlayer } = require('next-contentlayer');

module.exports = withContentlayer({
  reactStrictMode: true,
  swcMinify: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
  }
});
```

**Key Settings**:
- Contentlayer integration
- SWC minification enabled
- Console removal in production
- React Strict Mode

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2018",
    "lib": ["dom", "dom.iterable", "esnext"],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"],
      "contentlayer/generated": ["./.contentlayer/generated"]
    },
    "strict": true,
    // ... other settings
  }
}
```

**Key Settings**:
- Path aliases for clean imports
- Strict mode enabled
- Contentlayer type generation path

### tailwind.config.ts

See [Styling System](#styling-system) section for details.

### next-sitemap.config.js

```javascript
module.exports = {
  siteUrl: 'https://blog.funq.kr',
  generateRobotsTxt: true,
  // ... other settings
};
```

**Generates**:
- `public/sitemap.xml`
- `public/robots.txt`

### contentlayer.config.ts

See [Content Management](#content-management) section for details.

### .prettierrc

```json
{
  "printWidth": 120,
  "tabWidth": 4,
  "semi": true,
  "singleQuote": false,
  "trailingComma": "es5"
}
```

### playwright.config.ts

**Browsers**: Chromium, Firefox, WebKit
**Base URL**: `http://localhost:3000`
**Retries**: CI: 2, Local: 0

---

## Features

### 1. SEO Optimization

#### JSON-LD Structured Data
Every blog post includes NewsArticle schema:
```typescript
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "NewsArticle",
  headline: blog.title,
  description: blog.description,
  image: blog.image.filePath,
  datePublished: blog.publishedAt,
  dateModified: blog.updatedAt,
  author: { "@type": "Person", name: blog.author }
};
```

#### Open Graph & Twitter Cards
Full metadata for social sharing:
- `og:title`, `og:description`, `og:image`
- `twitter:card`, `twitter:title`, `twitter:image`
- Dynamic per page

#### Sitemap Generation
- Automated with `next-sitemap`
- Includes all static pages
- Regenerated on build
- `robots.txt` included

### 2. Code Syntax Highlighting

**Library**: Shiki via rehype-pretty-code
**Theme**: `github-dark`
**Features**:
- Line numbers
- Line highlighting
- Character highlighting
- Code titles
- Language badges

**MDX Usage**:
````markdown
```javascript title="example.js" {2-4} showLineNumbers
const hello = "world";
// Lines 2-4 highlighted
console.log(hello);
```
````

### 3. Theme System

**Implementation**: Custom hook + localStorage + class-based dark mode

**Features**:
- Respects system preference (`prefers-color-scheme`)
- Persists user choice in localStorage
- No flash of unstyled content (inline script in layout)
- Smooth transitions between themes

**Theme Toggle**: Header component button

### 4. View Tracking

**Backend**: Supabase PostgreSQL
**Table**: `views`
**Schema**:
```sql
{
  slug: text (primary key),
  count: integer
}
```

**RPC Function**: `increment_view_count(slug_text)`
**Client**: Singleton pattern for efficiency
**Display**: ViewCounter component on blog posts

### 5. Table of Contents

**Generation**: Contentlayer computed field
**Source**: Markdown headings (H1-H6)
**Usage**: Can be used for in-page navigation (not currently implemented in UI)

**Data Structure**:
```typescript
toc: [
  { level: 'two', text: 'Introduction', slug: 'introduction' },
  { level: 'three', text: 'Getting Started', slug: 'getting-started' }
]
```

### 6. Reading Time

**Library**: `reading-time`
**Calculation**: Based on word count and average reading speed
**Display**: Blog cards and post headers

**Output**:
```typescript
{
  text: "5 min read",
  minutes: 5,
  time: 300000,
  words: 1000
}
```

### 7. PWA Support

**Manifest**: `app/manifest.ts`
**Features**:
- Custom name and description
- App icons (multiple sizes)
- Theme color
- Display mode
- Start URL

**User Benefit**: Can be installed as app on mobile/desktop

### 8. Responsive Design

**Breakpoints**:
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px
- Custom: 480px (xs), 1180px (sxl)

**Mobile Menu**: Hamburger navigation in Header

### 9. Image Optimization

**Component**: Next.js `<Image>`
**Features**:
- Automatic WebP conversion
- Blur placeholders (from Contentlayer)
- Responsive sizes
- Lazy loading
- Priority loading for above-fold images

### 10. Contact Form

**Library**: React Hook Form
**Validation**: Email format, required fields
**UI**: Styled with Tailwind + Lottie animation
**Note**: Form submission logic not implemented (client-side only)

### 11. Comments System (Giscus)

**Implementation**: GitHub Discussions-based comments via Giscus
**Repository**: `nasodev/blog-nextjs-comments` (Public, separate from main codebase)

**Features**:
- GitHub account-based authentication
- Markdown support in comments
- Reactions (👍, ❤️, etc.)
- Reply/threading support
- Spam protection via GitHub
- Theme synchronization (dark/light mode)
- Korean language UI
- Lazy loading for performance

**Configuration**:
```typescript
<Giscus
  repo="nasodev/blog-nextjs-comments"
  repoId="R_kgDOQWjVAA"
  category="Announcements"
  categoryId="DIC_kwDOQWjVAM4Cx1qT"
  mapping="pathname"  // URL path maps to discussion
  theme={theme === "dark" ? "dark" : "light"}
  lang="ko"
/>
```

**Why Giscus?**:
- ✅ **100% Free** - No cost, unlimited comments
- ✅ **Privacy-friendly** - Code stays private, only comments public
- ✅ **Developer-focused** - GitHub account required (perfect for tech blog)
- ✅ **No maintenance** - GitHub manages storage, spam, moderation
- ✅ **SEO benefits** - Comments indexed by search engines
- ✅ **Easy setup** - 5 minutes to configure

**Component**: [components/Comments/index.tsx](components/Comments/index.tsx)
**Integration**: Displayed at bottom of each blog post ([app/blogs/[slug]/page.tsx](app/blogs/[slug]/page.tsx))

---

## Development Guidelines

### When Adding New Features

1. **Check existing patterns** - Follow established component structure
2. **Use TypeScript** - Define proper types in `types/index.ts`
3. **Mobile-first** - Design for mobile, enhance for desktop
4. **SEO considerations** - Add metadata, structured data
5. **Test dark mode** - Ensure theme compatibility
6. **Use Contentlayer** - For any content-driven features
7. **Optimize images** - Always use Next.js Image component
8. **Update this doc** - Document significant changes

### Coding Standards

**File Naming**:
- Components: PascalCase (`BlogLayoutOne.tsx`)
- Utilities: camelCase (`siteMetaData.tsx`)
- Config files: kebab-case (`next-sitemap.config.js`)

**Import Order**:
1. React/Next imports
2. Third-party libraries
3. Local components
4. Types
5. Styles

**Component Structure**:
```typescript
// 1. Imports
import React from 'react';

// 2. Types
interface Props {
  // ...
}

// 3. Component
export default function ComponentName({ props }: Props) {
  // 4. Hooks
  // 5. Event handlers
  // 6. Render
  return (/* JSX */);
}
```

### Git Workflow

**Current Branch**: `main`
**Clean Status**: No uncommitted changes
**Recent Commits**:
- SEO JSON-LD implementation
- Supabase refactoring
- Image optimization
- PWA manifest

**Commit Message Pattern**:
- Korean language
- Descriptive but concise
- Examples: "seo를 위한 json-ld 추가", "이미지 최적화"

### Testing

**E2E**: Playwright configured
**Command**: `npm run test:e2e`
**Browsers**: Chromium, Firefox, WebKit

**Recommended Test Coverage**:
- Homepage rendering
- Blog post navigation
- Category filtering
- Theme switching
- Contact form validation
- Mobile menu functionality

### Performance Checklist

- [ ] Use static generation where possible
- [ ] Optimize images (Next.js Image)
- [ ] Minimize client-side JavaScript
- [ ] Code splitting (dynamic imports)
- [ ] Remove console logs in production
- [ ] Enable SWC minification
- [ ] Lazy load below-fold content
- [ ] Monitor Core Web Vitals

---

## Improvement Opportunities

### High Priority

1. **Search Functionality**
   - Full-text search across posts
   - Tag/category filtering
   - Consider Algolia or Fuse.js

2. ~~**Comments System**~~ ✅ **COMPLETED**
   - ✅ Giscus (GitHub Discussions) implemented
   - Repository: `nasodev/blog-nextjs-comments`
   - Features: Markdown, reactions, threading, spam protection
   - See [Features](#11-comments-system-giscus) for details

3. **RSS Feed**
   - Generate XML feed
   - Use `feed` package
   - Add to `<head>` links

4. **Related Posts**
   - Tag-based similarity
   - Display at end of posts
   - Increase engagement

5. **Newsletter Integration**
   - Connect form to email service
   - Mailchimp, ConvertKit, or Resend
   - Automate new post notifications

### Medium Priority

6. **Social Share Buttons**
   - Twitter, LinkedIn, Facebook
   - Native Web Share API
   - Copy link button

7. **TOC Navigation**
   - Sticky table of contents
   - Active section highlighting
   - Smooth scroll to heading

8. **Analytics**
   - Google Analytics or Vercel Analytics
   - Track page views, user flow
   - Monitor Core Web Vitals

9. **Image Gallery/Lightbox**
   - Click to expand images
   - Keyboard navigation
   - Consider `yet-another-react-lightbox`

10. **Code Copy Button**
    - One-click copy for code blocks
    - Toast notification
    - Enhance developer experience

### Low Priority

11. **Multi-language Support**
    - i18n with next-intl
    - Korean/English toggle
    - Translated posts

12. **Series/Collections**
    - Group related posts
    - Series navigation
    - Progress tracking

13. **Post Reactions**
    - Like/useful buttons
    - Store in Supabase
    - Display counts

14. **Author Pages**
    - Multi-author support
    - Author bios
    - Filter by author

15. **Advanced Search Filters**
    - Date range
    - Reading time
    - Popularity sorting

### Technical Improvements

16. **Upgrade Dependencies**
    - Next.js 14+ (App Router improvements)
    - React 19 (when stable)
    - Latest Contentlayer

17. **Performance Monitoring**
    - Lighthouse CI
    - Web Vitals dashboard
    - Performance budgets

18. **Accessibility Audit**
    - WCAG 2.1 AA compliance
    - Keyboard navigation
    - Screen reader testing

19. **Error Boundaries**
    - Graceful error handling
    - Custom error pages
    - Error logging (Sentry)

20. **Content Preview Mode**
    - Draft preview without publishing
    - Shareable preview links
    - Contentlayer draft support

---

## Environment Variables

Required for full functionality:

```bash
# Supabase (View Counting)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional: Analytics
# NEXT_PUBLIC_GA_ID=your_google_analytics_id
```

---

## Build & Deployment

### Development
```bash
npm run dev          # Start dev server (port 3000)
npm run build        # Build for production
npm run start        # Start production server
npm run test:e2e     # Run Playwright tests
```

### Production Considerations

1. **Environment**: Production builds remove console logs
2. **Caching**: Static pages cached by CDN
3. **Regeneration**: Rebuild on content changes
4. **Monitoring**: Consider error tracking (Sentry)
5. **CDN**: Vercel recommended for Next.js

---

## AI Agent Development Tips

### When Making Changes

1. **Always check existing patterns** before creating new ones
2. **Read component files** to understand current implementation
3. **Test dark mode** - Many styles have dark: variants
4. **Update types** in `types/index.ts` if adding new data structures
5. **Check mobile responsiveness** - Use Tailwind responsive prefixes
6. **Validate with Contentlayer** - Content schema must match frontmatter
7. **Consider SEO** - Update metadata for new pages
8. **Use Korean** for user-facing text (site is in Korean)

### Common Patterns

**Fetching all blogs**:
```typescript
import { allBlogs } from 'contentlayer/generated';
const sortedBlogs = allBlogs
  .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
  .filter(blog => blog.isPublished);
```

**Creating metadata**:
```typescript
export async function generateMetadata({ params }): Promise<Metadata> {
  return {
    title: '...',
    description: '...',
    openGraph: { /* ... */ }
  };
}
```

**Using Supabase**:
```typescript
import { getSupabaseClient } from '@/lib/supabase/client';
const supabase = getSupabaseClient();
```

**Dark mode styling**:
```typescript
<div className="bg-light dark:bg-dark text-dark dark:text-light">
```

### Files to Review Before Changes

- **New component**: Check similar components in `components/`
- **New page**: Review existing pages in `app/`
- **Content changes**: Check `contentlayer.config.ts` schema
- **Styling changes**: Review `tailwind.config.ts` custom theme
- **Data fetching**: Check patterns in existing pages
- **SEO changes**: Review current metadata generation

---

## Support & Resources

- **Next.js Docs**: https://nextjs.org/docs
- **Contentlayer Docs**: https://contentlayer.dev
- **Tailwind Docs**: https://tailwindcss.com/docs
- **Supabase Docs**: https://supabase.com/docs
- **Site URL**: https://blog.funq.kr

---

**Document Version**: 1.0
**Generated**: 2025-11-16
**Generated By**: Claude Code AI Analysis
