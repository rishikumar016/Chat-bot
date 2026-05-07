"use client"

import { useRouter } from "next/navigation"
import { useLogoutMutation } from "@/lib/store/auth-api"
import { Button } from "@/components/ui/button"

export function LogoutButton() {
  const router = useRouter()
  const [logout, { isLoading }] = useLogoutMutation()

  async function handleLogout() {
    try {
      await logout().unwrap()
    } catch {
      // local state is reset regardless via onQueryStarted
    }
    router.push("/sign-in")
  }

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={isLoading}
      onClick={handleLogout}
    >
      {isLoading ? "Signing out..." : "Sign out"}
    </Button>
  )
}
