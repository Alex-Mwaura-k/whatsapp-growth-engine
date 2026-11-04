export default function AuthBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-gradient-to-br from-blue-50 via-white to-indigo-50" aria-hidden="true">
      <div className="auth-blob absolute -left-24 -top-24 h-96 w-96 rounded-full bg-blue-400/30 blur-3xl" />
      <div className="auth-blob auth-blob-slow absolute -bottom-32 -right-24 h-[28rem] w-[28rem] rounded-full bg-indigo-400/25 blur-3xl" />
      <div className="auth-blob auth-blob-delay absolute left-[35%] top-1/3 h-72 w-72 rounded-full bg-emerald-300/20 blur-3xl" />
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
        }}
      />
    </div>
  );
}
