import { FormEvent, ReactElement, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/core/Button";
import { login } from "../clients/admin/sdk.gen";
import { adminClient } from "../clients/config";
import { setAuthToken } from "../auth/token";

export function LoginPage(): ReactElement {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    document.title = "Login | HyperLEDA";
  }, []);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    try {
      const response = await login({
        client: adminClient,
        body: { username, password },
      });
      const token = response.data?.data?.token;

      if (response.error || !token) {
        throw new Error("Invalid username or password");
      }

      setAuthToken(token);
      setSuccess(true);
      navigate("/");
    } catch (submitError) {
      setError(`${submitError}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">Login</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="username" className="block mb-1">
            Username
          </label>
          <input
            id="username"
            type="text"
            required
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className="w-full border rounded px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="password" className="block mb-1">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full border rounded px-3 py-2"
          />
        </div>
        <Button type="submit" disabled={loading}>
          {loading ? "Logging in..." : "Log in"}
        </Button>
      </form>
      {error ? (
        <p className="text-red-400 mt-3" role="alert">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="text-green-400 mt-3">Logged in successfully.</p>
      ) : null}
    </div>
  );
}
