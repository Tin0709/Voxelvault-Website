import { useState } from "react";
import { Link } from "react-router";

const inputClass =
  "mt-2 w-full rounded-xl border border-white/10 bg-background px-4 py-3 text-sm text-on-surface outline-none transition placeholder:text-on-surface-variant/60 focus:border-primary focus:ring-2 focus:ring-primary/15";

function AuthPage({ mode = "login" }) {
  const isRegister = mode === "register";

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  function updateField(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    setError("");
    setMessage("");
  }

  function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (isRegister && !form.name.trim()) {
      setError("Please enter your display name.");
      return;
    }

    if (!form.email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    if (isRegister && form.password.length < 8) {
      setError("Use at least 8 characters for your password.");
      return;
    }

    if (isRegister && form.password !== form.confirmPassword) {
      setError("Your passwords do not match.");
      return;
    }

    setMessage(
      isRegister
        ? "Form checked. Account creation will be available when the service is connected."
        : "Form checked. Sign-in will be available when the service is connected.",
    );

    setForm((current) => ({
      ...current,
      password: "",
      confirmPassword: "",
    }));
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 items-center px-6 py-12 lg:px-10 lg:py-20">
      <div className="grid w-full items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <section className="max-w-lg">
          <p className="text-xs uppercase tracking-[0.25em] text-primary">
            VoxelVault
          </p>

          <h1 className="mt-5 font-headline-lg text-4xl leading-tight tracking-tight sm:text-5xl">
            Your ideas deserve
            <br />
            <span className="text-primary">a place to belong.</span>
          </h1>

          <p className="mt-6 text-base leading-relaxed text-on-surface-variant">
            Collect your favorite moments, share your creations, and tell the
            stories behind them.
          </p>

          <Link
            to="/"
            className="mt-7 inline-block text-sm text-primary hover:underline"
          >
            ← Keep exploring
          </Link>
        </section>

        <section
          aria-labelledby="auth-heading"
          className="w-full rounded-3xl border border-white/10 bg-white/[0.03] p-6 sm:p-8"
        >
          <p className="text-xs uppercase tracking-[0.2em] text-primary">
            {isRegister ? "Join the collection" : "Welcome back"}
          </p>

          <h2 id="auth-heading" className="mt-3 font-headline-lg text-3xl">
            {isRegister ? "Create an account" : "Sign in"}
          </h2>

          <p className="mt-3 text-sm text-on-surface-variant">
            Demo form — accounts are not connected yet.
          </p>

          <form onSubmit={handleSubmit} className="mt-7 space-y-5">
            {isRegister && (
              <label className="block text-sm">
                Display name
                <input
                  name="name"
                  value={form.name}
                  onChange={updateField}
                  autoComplete="nickname"
                  placeholder="Your display name"
                  required
                  maxLength={50}
                  className={inputClass}
                />
              </label>
            )}

            <label className="block text-sm">
              Email address
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={updateField}
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="you@example.com"
                required
                className={inputClass}
              />
            </label>

            <div>
              <label htmlFor="auth-password" className="block text-sm">
                Password
              </label>

              <div className="relative">
                <input
                  id="auth-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={updateField}
                  autoComplete={
                    isRegister ? "new-password" : "current-password"
                  }
                  minLength={isRegister ? 8 : undefined}
                  aria-describedby={isRegister ? "password-hint" : undefined}
                  required
                  className={`${inputClass} pr-20`}
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-controls={
                    isRegister
                      ? "auth-password auth-confirm-password"
                      : "auth-password"
                  }
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs text-primary hover:bg-primary/10"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>

              {isRegister && (
                <p
                  id="password-hint"
                  className="mt-2 text-xs text-on-surface-variant"
                >
                  Use at least 8 characters.
                </p>
              )}
            </div>

            {isRegister && (
              <label className="block text-sm">
                Confirm password
                <input
                  id="auth-confirm-password"
                  name="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  value={form.confirmPassword}
                  onChange={updateField}
                  autoComplete="new-password"
                  required
                  className={inputClass}
                />
              </label>
            )}

            {error && (
              <p role="alert" className="text-sm text-red-300">
                {error}
              </p>
            )}

            {message && (
              <p
                role="status"
                className="rounded-xl bg-primary/10 p-4 text-sm leading-relaxed text-primary"
              >
                {message}
              </p>
            )}

            <button
              type="submit"
              className="w-full rounded-full bg-primary px-5 py-3 text-sm font-medium text-on-primary transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
            >
              {isRegister ? "Try registration form" : "Try sign-in form"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-on-surface-variant">
            {isRegister ? "Already have an account? " : "New to VoxelVault? "}

            <Link
              to={isRegister ? "/login" : "/register"}
              className="font-medium text-primary hover:underline"
            >
              {isRegister ? "Sign in" : "Create an account"}
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}

export default AuthPage;
