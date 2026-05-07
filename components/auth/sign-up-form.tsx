"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { useRegisterMutation } from "@/lib/store/auth-api"
import { signUpSchema, type SignUpValues } from "@/lib/auth/schemas"
import { Button } from "@/components/ui/button"
import { Form, FormField } from "@/components/ui/form"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"

export function SignUpForm() {
  const router = useRouter()
  const [register, { isLoading, isSuccess, error }] = useRegisterMutation()

  const form = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
    },
  })

  async function onSubmit(values: SignUpValues) {
    try {
      await register(values).unwrap()
      router.push("/sign-in")
    } catch {
      // surfaced via the `error` field below
    }
  }

  const apiErrorMessage = (() => {
    if (!error) return null
    if (
      typeof error === "object" &&
      "data" in error &&
      error.data &&
      typeof error.data === "object" &&
      "message" in (error.data as Record<string, unknown>)
    ) {
      return (error.data as { message: string }).message
    }
    if (error instanceof Error) return error.message
    return "Registration failed"
  })()

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
        {apiErrorMessage && (
          <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {apiErrorMessage}
          </div>
        )}

        {isSuccess && (
          <div className="rounded-md bg-green-500/10 px-4 py-3 text-sm text-green-700 dark:text-green-400">
            Account created! Redirecting to sign in...
          </div>
        )}

        <FieldGroup>
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field, fieldState }) => (
                <Field data-invalid={!!fieldState.error}>
                  <FieldLabel htmlFor="firstName">First name</FieldLabel>
                  <Input
                    id="firstName"
                    autoComplete="given-name"
                    placeholder="John"
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
              name="lastName"
              render={({ field, fieldState }) => (
                <Field data-invalid={!!fieldState.error}>
                  <FieldLabel htmlFor="lastName">Last name</FieldLabel>
                  <Input
                    id="lastName"
                    autoComplete="family-name"
                    placeholder="Doe"
                    aria-invalid={!!fieldState.error}
                    {...field}
                  />
                  <FieldError
                    errors={fieldState.error ? [fieldState.error] : undefined}
                  />
                </Field>
              )}
            />
          </div>

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
                  autoComplete="new-password"
                  placeholder="Min 8 chars, upper, lower, digit, special"
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
          {isLoading ? "Creating account..." : "Create account"}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/sign-in" className="font-medium text-primary underline">
            Sign in
          </Link>
        </p>
      </form>
    </Form>
  )
}
