export const metadata = {
  title: 'Slow Page - Last.js',
  description: 'A page that demonstrates loading state',
};

export default function SlowPage() {
  return (
    <div>
      <h1>Slow Page</h1>
      <p>This page has a loading.tsx component.</p>
      <div
        style={{
          padding: '1.5rem',
          background: '#e8f5e9',
          borderRadius: '8px',
          marginTop: '1rem',
        }}
      >
        <p style={{ margin: 0, color: '#2e7d32' }}>
          ✅ Page loaded successfully!
        </p>
        <p
          style={{
            margin: '0.5rem 0 0 0',
            color: '#666',
            fontSize: '0.875rem',
          }}
        >
          The loading state would show during client-side navigation or
          streaming SSR.
        </p>
      </div>
    </div>
  );
}
