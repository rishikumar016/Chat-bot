import { SignInForm } from "@/components/auth/sign-in-form"

export const metadata = { title: "Sign In" }

export default function SignInPage() {
  return (
    <div className="grid gap-6">
      <div className="grid gap-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
        <p className="text-sm text-muted-foreground">
          Enter your credentials to access your account
        </p>
      </div>
      <SignInForm />
    </div>
  )
}
