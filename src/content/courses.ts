/**
 * The course catalogue.
 *
 * This is the single source of truth the site renders from.  Lessons are plain
 * data for now; once the lesson Markdown pipeline lands, each `Lesson.slug`
 * will resolve to a file under `src/content/lessons/<course>/<slug>.md` and the
 * `status` field will drive whether a lesson is readable or still a stub.
 */

export type CourseLevel = 'Beginner' | 'Intermediate' | 'Advanced'

/** `draft` lessons exist as notes, `planned` lessons are outlined only. */
export type LessonStatus = 'draft' | 'planned'

export interface Lesson {
  readonly slug: string
  readonly title: string
  readonly summary: string
  /** Rough reading plus practice time, in minutes. */
  readonly minutes: number
  readonly status: LessonStatus
}

export interface Course {
  readonly slug: string
  readonly title: string
  /** Broad grouping shown as a mono label, for example "Systems". */
  readonly track: string
  readonly level: CourseLevel
  readonly summary: string
  /** A longer paragraph for the course's own page. */
  readonly description: string
  readonly stack: readonly string[]
  /** What a reader can do once the course is finished. */
  readonly outcomes: readonly string[]
  readonly lessons: readonly Lesson[]
}

export const courses: readonly Course[] = [
  {
    slug: 'rust-foundations',
    title: 'Rust Foundations',
    track: 'Systems',
    level: 'Beginner',
    summary:
      'Learn ownership, borrowing and the borrow checker by building small tools that actually run, not by memorising rules.',
    description:
      'Rust rewards a different mental model than most languages: values have owners, borrows are checked before the program runs, and the compiler is a fast, blunt reviewer. This course builds that model from the ground up by writing real command line tools, so lifetimes and traits stop being trivia and start being the reason the code compiles.',
    stack: ['Rust', 'Cargo', 'Edition 2024'],
    outcomes: [
      'Read and write functions that borrow instead of copy',
      'Use enums and pattern matching to model state',
      'Handle errors with Result instead of panicking',
      'Structure a Cargo project across modules and crates',
    ],
    lessons: [
      {
        slug: 'why-rust',
        title: 'Why Rust, and what the compiler is protecting',
        summary:
          'The problem ownership solves, shown with a bug that other languages let you ship.',
        minutes: 25,
        status: 'draft',
      },
      {
        slug: 'values-and-ownership',
        title: 'Values, moves and ownership',
        summary: 'What a move actually does to memory, and why a moved value cannot be used again.',
        minutes: 40,
        status: 'planned',
      },
      {
        slug: 'borrowing',
        title: 'Borrowing and the borrow checker',
        summary:
          'Immutable and mutable references, the aliasing rule, and how to read borrow errors.',
        minutes: 45,
        status: 'planned',
      },
      {
        slug: 'enums-and-matching',
        title: 'Enums, Option and exhaustive matching',
        summary: 'Modeling state so invalid states cannot be represented.',
        minutes: 35,
        status: 'planned',
      },
      {
        slug: 'results-and-errors',
        title: 'Result, the question mark operator and error design',
        summary: 'Propagating errors without exceptions, and when to reach for a library.',
        minutes: 40,
        status: 'planned',
      },
    ],
  },
  {
    slug: 'typescript-in-practice',
    title: 'TypeScript in Practice',
    track: 'Web',
    level: 'Intermediate',
    summary:
      'Use the type system to make refactors safe and bugs visible, instead of sprinkling annotations over JavaScript.',
    description:
      'Most teams use a fraction of what TypeScript can do. This course focuses on the parts that pay for themselves: narrowing, discriminated unions, generics that stay readable, and types that describe a domain rather than a shape. Every lesson ends with a refactor of working code, because that is where a type system earns its keep.',
    stack: ['TypeScript', 'Node.js', 'Vitest'],
    outcomes: [
      'Model a domain with discriminated unions instead of booleans',
      'Narrow types safely at every boundary that receives unknown data',
      'Write generics with constraints that read well at the call site',
      'Catch breaking changes with the compiler during a refactor',
    ],
    lessons: [
      {
        slug: 'types-that-earn-their-keep',
        title: 'Types that earn their keep',
        summary: 'Where static typing pays off, and where it is ceremony.',
        minutes: 20,
        status: 'draft',
      },
      {
        slug: 'narrowing',
        title: 'Narrowing and control flow analysis',
        summary: 'How the compiler tracks what a value can be on each branch.',
        minutes: 35,
        status: 'planned',
      },
      {
        slug: 'discriminated-unions',
        title: 'Discriminated unions for real state',
        summary: 'Replacing a pile of optional fields with one honest union.',
        minutes: 40,
        status: 'planned',
      },
      {
        slug: 'generics',
        title: 'Generics with constraints, not surprises',
        summary: 'Writing generic helpers that infer cleanly for the caller.',
        minutes: 45,
        status: 'planned',
      },
    ],
  },
  {
    slug: 'webassembly-from-the-ground-up',
    title: 'WebAssembly from the Ground Up',
    track: 'Systems',
    level: 'Advanced',
    summary:
      'Compile a real Rust crate to WebAssembly, load it in the browser, and pass data across the boundary without copying it twice.',
    description:
      'WebAssembly is the part of the web platform that lets a systems language run at near native speed in a tab. This course covers the whole path: what the module format actually is, how memory is shared with JavaScript, how to keep heavy work off the main thread with a Web Worker, and how to test the result. It is aimed at people who have shipped a Rust crate or a C library and want it running in a browser.',
    stack: ['Rust', 'wasm-bindgen', 'Web Workers'],
    outcomes: [
      'Build a Rust crate that targets wasm32 and runs in the browser',
      'Move strings and structs across the JavaScript boundary deliberately',
      'Run heavy computation in a Web Worker so the UI stays responsive',
      'Test the compiled module the same way you test any other code',
    ],
    lessons: [
      {
        slug: 'what-wasm-is',
        title: 'What WebAssembly is, and is not',
        summary: 'The module format, the sandbox, and why it is not a JavaScript replacement.',
        minutes: 30,
        status: 'draft',
      },
      {
        slug: 'first-crate',
        title: 'Compiling your first crate to wasm32',
        summary: 'Toolchain setup and what the generated bindings contain.',
        minutes: 40,
        status: 'planned',
      },
      {
        slug: 'crossing-the-boundary',
        title: 'Crossing the JavaScript boundary',
        summary: 'Numbers are easy; strings and structs need a plan.',
        minutes: 50,
        status: 'planned',
      },
      {
        slug: 'workers',
        title: 'Keeping the main thread free',
        summary: 'Wrapping the module in a worker and streaming results back.',
        minutes: 45,
        status: 'planned',
      },
    ],
  },
  {
    slug: 'vue-and-design-systems',
    title: 'Vue and Design Systems',
    track: 'Web',
    level: 'Intermediate',
    summary:
      'Build a small design system in Vue: shared tokens, themes that flip with one attribute, and components that stay accessible.',
    description:
      'A design system is mostly about constraints: a small set of colours, spacing and type that everyone agrees to use. This course builds one in Vue from the tokens up, adds a light and dark theme, and then holds every component to the same accessibility bar. It is the same approach used to build the site you are reading this on.',
    stack: ['Vue', 'TypeScript', 'Tailwind CSS'],
    outcomes: [
      'Define design tokens once and consume them from CSS and utilities',
      'Ship a theme switch that never flashes the wrong palette',
      'Build components that keyboard and screen reader users can operate',
      'Keep visual changes honest with component tests',
    ],
    lessons: [
      {
        slug: 'tokens-first',
        title: 'Tokens first',
        summary: 'One palette, defined as CSS variables, read everywhere else.',
        minutes: 30,
        status: 'draft',
      },
      {
        slug: 'theming',
        title: 'Theming without the flash',
        summary: 'Choosing a theme before first paint and storing the choice.',
        minutes: 30,
        status: 'planned',
      },
      {
        slug: 'accessible-components',
        title: 'Accessible components by default',
        summary: 'Focus states, labels and roles that come for free.',
        minutes: 40,
        status: 'planned',
      },
      {
        slug: 'testing-the-system',
        title: 'Testing the system',
        summary: 'Component tests that catch regressions without being brittle.',
        minutes: 35,
        status: 'planned',
      },
    ],
  },
  {
    slug: 'testing-that-pays-off',
    title: 'Testing That Pays Off',
    track: 'Practice',
    level: 'Intermediate',
    summary:
      'Write tests that catch real regressions and stay cheap to maintain, and learn when a test is not worth writing.',
    description:
      'Tests are a tool with a cost, and a suite nobody trusts is worse than no suite at all. This course covers what to test and what to leave alone, how to design code so it is testable without mocks everywhere, and how to keep a suite fast enough that people actually run it.',
    stack: ['Vitest', 'Playwright', 'TypeScript'],
    outcomes: [
      'Choose between unit, integration and end to end tests on purpose',
      'Design functions and modules that are easy to test',
      'Keep a suite fast and deterministic',
      'Recognise a flaky test and fix its cause',
    ],
    lessons: [
      {
        slug: 'what-to-test',
        title: 'What to test, and what to skip',
        summary: 'Spending test budget where regressions actually happen.',
        minutes: 25,
        status: 'draft',
      },
      {
        slug: 'testable-design',
        title: 'Designing for testability',
        summary: 'Dependencies, boundaries and why mocks multiply.',
        minutes: 40,
        status: 'planned',
      },
      {
        slug: 'beyond-unit-tests',
        title: 'Beyond unit tests',
        summary: 'Integration and end to end coverage for the paths that matter.',
        minutes: 40,
        status: 'planned',
      },
    ],
  },
  {
    slug: 'shipping-a-web-app',
    title: 'Shipping a Web App',
    track: 'Practice',
    level: 'Beginner',
    summary:
      'Take a front end from a local build to a real domain: routing, a theme, metadata, and a deploy that runs on every push.',
    description:
      'A project is not finished when it works on your machine. This course covers the last mile: client side routing that survives a refresh, link previews that social platforms read without running JavaScript, a sitemap and robots file, and a continuous deployment pipeline that publishes the site on every push to main.',
    stack: ['Vite', 'GitHub Actions', 'GitHub Pages'],
    outcomes: [
      'Deploy a static site to a custom domain on every push',
      'Handle client side routes so a refresh does not 404',
      'Write metadata that link previews actually read',
      'Keep the deploy pipeline honest with a build check',
    ],
    lessons: [
      {
        slug: 'routing-that-survives-refresh',
        title: 'Routing that survives a refresh',
        summary: 'How a single page app 404s on a static host, and the fix.',
        minutes: 30,
        status: 'draft',
      },
      {
        slug: 'metadata-and-previews',
        title: 'Metadata and link previews',
        summary: 'Open Graph tags, since crawlers do not run your JavaScript.',
        minutes: 25,
        status: 'planned',
      },
      {
        slug: 'deploy-on-push',
        title: 'Deploy on push',
        summary: 'A GitHub Actions workflow that builds and publishes the site.',
        minutes: 35,
        status: 'planned',
      },
    ],
  },
]

/** Look a course up by its URL slug.  Returns undefined for unknown slugs. */
export function findCourse(slug: string): Course | undefined {
  return courses.find((course) => course.slug === slug)
}

/** Total lesson count across the catalogue, for headline figures. */
export function totalLessonCount(): number {
  return courses.reduce((total, course) => total + course.lessons.length, 0)
}
