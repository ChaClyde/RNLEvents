import { useState, type FormEvent } from "react";
import { isAxiosError } from "axios";
import { useAuth } from "../../contexts/AuthContext";
import SubmitButton from "../../components/Button/SubmitButton";
import FloatingLabelInput from "../../components/Input/FloatingLabelInput";

const LoginPage = () => {
  const { login } = useAuth();
  const [loginValue, setLoginValue] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await login({ login: loginValue.trim(), password });
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 422) {
        setError(
          err.response.data?.errors?.login?.[0] ??
            err.response.data?.message ??
            "Invalid credentials.",
        );
      } else if (isAxiosError(err) && err.response?.status === 403) {
        setError(
          err.response.data?.message ??
            "This account is inactive. Contact an administrator.",
        );
      } else {
        setError("Unable to sign in. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#1E3A5F] p-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md space-y-5 rounded-3xl bg-white p-8 shadow-xl"
      >
        <div>
          <h1 className="text-2xl font-bold text-[#1E3A5F]">FilSched</h1>
          <p className="mt-2 text-sm text-slate-600">
            Sign in with your email or username.
          </p>
        </div>

        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <FloatingLabelInput
          name="login"
          label="Email or username"
          type="text"
          value={loginValue}
          onChange={(event) => setLoginValue(event.target.value)}
          required
        />

        <FloatingLabelInput
          name="password"
          label="Password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />

        <SubmitButton
          label="Sign in"
          loading={submitting}
          loadingLabel="Signing in..."
        />
      </form>
    </div>
  );
};

export default LoginPage;
