"use client"
import { useAuth } from "@/hooks/use-auth"
import {
  useCallerQuery,
  type CallerQueryServiceDefinition,
} from "@/utils/caller"

// Public catalog queries keep their shared keys. Private records must not be
// reused when Better Auth observes an account switch in another browser tab.
export function createAccountQueryService<TData, TArg>(
  definition: CallerQueryServiceDefinition<TData, TArg>
) {
  return function useAccountQuery(arg: TArg) {
    const subject = useAuth().account?.id
    const request =
      typeof definition.query === "function"
        ? definition.query(arg)
        : definition.query
    const key =
      typeof definition.queryKey === "function"
        ? definition.queryKey(arg)
        : definition.queryKey
    const options =
      typeof definition.queryOptions === "function"
        ? definition.queryOptions(arg)
        : definition.queryOptions
    const enabled = options?.enabled
    return useCallerQuery<TData>({
      ...request,
      queryKey: [...key, subject],
      queryOptions: {
        ...options,
        enabled: (query) =>
          Boolean(subject) &&
          (typeof enabled === "function" ? enabled(query) : (enabled ?? true)),
      },
    })
  }
}
