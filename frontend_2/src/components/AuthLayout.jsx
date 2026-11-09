// Single-column auth layout: a centered card holding the account form.
export default function AuthLayout({ children }) {
  return (
    <div className="auth-layout">
      <section className="auth-form-col" aria-labelledby="auth-heading">
        <h1 id="auth-heading" className="auth-heading">Your reader profile.</h1>
        {children}
      </section>
    </div>
  );
}
