// Single-column auth layout: a centered card holding the account form.
export default function AuthLayout({ children }) {
  return (
    <div className="flex min-h-[calc(100vh-72px)] items-start justify-center bg-background px-4 py-12 font-sans text-foreground">
      <section className="w-full max-w-md rounded-xl bg-card p-6 ring-1 ring-foreground/10" aria-labelledby="auth-heading">
        <h1 id="auth-heading" className="mb-5 font-heading text-3xl font-bold tracking-tight">Your reader profile.</h1>
        {children}
      </section>
    </div>
  );
}
