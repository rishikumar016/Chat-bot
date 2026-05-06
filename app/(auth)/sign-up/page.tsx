import { SignUpForm } from "@/components/auth/sign-up-form"

export const metadata = { title: "Sign Up" }

export default function SignUpPage() {
  return (
    <div className="grid gap-6">
      <div className="grid gap-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Create an account</h1>
        <p className="text-sm text-muted-foreground">
          Fill in the details below to get started
        </p>
      </div>
      <SignUpForm />
    </div>
  )
}
