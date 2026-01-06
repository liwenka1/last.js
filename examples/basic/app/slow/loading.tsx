export default function SlowLoading() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '200px',
        gap: '1rem',
        padding: '2rem',
        background: '#fff3e0',
        borderRadius: '8px',
      }}
    >
      <div
        style={{
          width: '50px',
          height: '50px',
          border: '4px solid #ffe0b2',
          borderTop: '4px solid #ff9800',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }}
      />
      <p style={{ color: '#e65100', margin: 0, fontWeight: 500 }}>
        Loading slow page...
      </p>
      <p style={{ color: '#bf360c', margin: 0, fontSize: '0.875rem' }}>
        This takes about 2 seconds
      </p>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
