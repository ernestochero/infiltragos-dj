"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, rememberMe }),
    });
    if (res.ok) {
      router.push("/admin");
    } else if (res.status === 401) {
      setError("Invalid credentials");
    } else {
      setError("Login failed");
    }
  };

  return (
    <main className="p-4 max-w-sm mx-auto">
      <h1 className="text-2xl font-bold mb-4 text-center">DJ Login</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <span className="sr-only">Username</span>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
            className="border p-2 w-full"
            required
            autoComplete="username"
          />
        </label>
        <label className="block">
          <span className="sr-only">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="border p-2 w-full"
            required
            autoComplete="current-password"
          />
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
          />
          <span>Remember me</span>
        </label>
        {error && <p className="text-red-500" role="alert">{error}</p>}
        <button
          type="submit"
          className="bg-blue-500 text-white px-3 py-2 rounded w-full"
        >
          Login
        </button>
      </form>
    </main>
  );
}
