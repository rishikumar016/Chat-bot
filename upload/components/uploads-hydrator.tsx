"use client"

import { useEffect } from "react"
import { useAppDispatch } from "@/lib/store/hooks"
import { hydrateUploads } from "../slice"

/**
 * Reads persisted upload metadata from IndexedDB on mount and seeds the
 * Redux slice. Renders nothing. The thunk is idempotent — multiple
 * mounts won't re-read IDB.
 */
export function UploadsHydrator() {
  const dispatch = useAppDispatch()
  useEffect(() => {
    dispatch(hydrateUploads())
  }, [dispatch])
  return null
}
