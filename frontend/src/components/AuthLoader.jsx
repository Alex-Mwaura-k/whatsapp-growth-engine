export default function AuthLoader() {
  return (
    <div role="status" aria-label="Loading" className="h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950">
      <div className="h-3 w-3 animate-pulse rounded-full bg-blue-600" />
    </div>
  );
}
