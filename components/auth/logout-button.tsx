"use client"

import { useLogout } from "@/lib/auth/hooks"
import { Button } from "@/components/ui/button"

export function LogoutButton() {
  const { mutate, isPending } = useLogout()

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={() => mutate()}
    >
      {isPending ? "Signing out..." : "Sign out"}
    </Button>
  )
}
