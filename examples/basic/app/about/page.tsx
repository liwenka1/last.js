export const metadata = {
  title: 'About - Last.js',
  description: 'Learn more about Last.js framework',
};

export default function AboutPage() {
  return (
    <div>
      <h1>About Last.js</h1>
      <p>
        Last.js is a minimal Next.js alternative built with modern web
        technologies.
      </p>

      <h2>Tech Stack</h2>
      <ul>
        <li>
          <strong>React 19</strong> - Latest React with Server Components
        </li>
        <li>
          <strong>Vite</strong> - Lightning fast build tool
        </li>
        <li>
          <strong>Nitro</strong> - Universal server engine
        </li>
        <li>
          <strong>TypeScript</strong> - Type-safe development
        </li>
      </ul>

      <h2>Why Last.js?</h2>
      <p>
        We wanted to create a framework that captures the essence of
        Next.js&apos;s App Router while keeping the codebase minimal and
        understandable. Perfect for learning how modern React frameworks work
        under the hood.
      </p>
    </div>
  );
}
