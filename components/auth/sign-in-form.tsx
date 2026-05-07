"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { useLoginMutation } from "@/lib/store/auth-api"
import { signInSchema, type SignInValues } from "@/lib/auth/schemas"
import { Button } from "@/components/ui/button"
import { Form, FormField } from "@/components/ui/form"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"

export function SignInForm() {
  const router = useRouter()
  const [login, { isLoading, error }] = useLoginMutation()

  const form = useForm<SignInValues>({
    resolver: zodResolver(signInSchema as any),
    defaultValues: { email: "", password: "" },
  })

  async function onSubmit(values: SignInValues) {
    try {
      await login(values).unwrap()
      router.push("/dashboard")
    } catch {
      // surfaced via the `error` field below
    }
  }

 
  function getApiErrorMessage(err: unknown): string | null {
    // No error → nothing to show.
    if (!err) return null
    const data = (err as { data?: { message?: string } }).data
    if (data?.message) return data.message

    if (err instanceof Error) return err.message
    return "Sign in failed"
  }

  const apiErrorMessage = getApiErrorMessage(error)

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
        {apiErrorMessage && (
          <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {apiErrorMessage}
          </div>
        )}

        <FieldGroup>
          <FormField
            control={form.control}
            name="email"
            render={({ field, fieldState }) => (
              <Field data-invalid={!!fieldState.error}>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  aria-invalid={!!fieldState.error}
                  {...field}
                />
                <FieldError
                  errors={fieldState.error ? [fieldState.error] : undefined}
                />
              </Field>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field, fieldState }) => (
              <Field data-invalid={!!fieldState.error}>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="********"
                  aria-invalid={!!fieldState.error}
                  {...field}
                />
                <FieldError
                  errors={fieldState.error ? [fieldState.error] : undefined}
                />
              </Field>
            )}
          />
        </FieldGroup>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Signing in..." : "Sign in"}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/sign-up" className="font-medium text-primary underline">
            Sign up
          </Link>
        </p>
      </form>
    </Form>
  )
}
