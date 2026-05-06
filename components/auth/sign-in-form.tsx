"use client"

import { useState, type FormEvent } from "react"
import Link from "next/link"
import { useLogin } from "@/lib/auth/hooks"
import { Button } from "@/components/ui/button"

export function SignInForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const { mutate, isPending, error } = useLogin()

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    mutate({ email, password })
  }

  const errorMessage =
    (error as { response?: { data?: { message?: string } } })?.response?.data
      ?.message ??
    (error instanceof Error ? error.message : null)

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      {errorMessage && (
        <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {errorMessage}
        </div>
      )}

      <div className="grid gap-2">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <div className="grid gap-2">
        <label htmlFor="password" className="text-sm font-medium">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          placeholder="********"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Signing in..." : "Sign in"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link href="/sign-up" className="font-medium text-primary underline">
          Sign up
        </Link>
      </p>
    </form>
  )
}
