"use client"
import Link from "next/link"
import { Button } from "@gorth-com/primitive/custom/button"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@gorth-com/primitive/default/card"
import { Spinner } from "@gorth-com/primitive/default/spinner"
import { useAuth } from "@/hooks/use-auth"
import { OrganizationContextSelector } from "@/components/organization/context-selector"
import { authUrl } from "@/utils/environment"
export function AccountOverview() {
  const auth = useAuth()
  if (auth.loading) return <Spinner aria-label="Loading account" />
  if (!auth.authenticated)
    return (
      <Button
        disabled={auth.signingIn}
        aria-busy={auth.signingIn}
        onClick={() => auth.login("/account")}
      >
        Sign in
      </Button>
    )
  const links = [
    ["Order", "/order"],
    ["Subscription", "/account/subscription"],
    ["Organization & branch", "/seller/organization"],
    ["Business management", "/seller/workspace/merchant"],
    ["Notification", "/seller/service/notification"],
    ["Profile & security", new URL("/settings", authUrl).href],
  ]
  return (
    <Card>
      <CardHeader>
        <CardTitle>{auth.account?.name || "Account"}</CardTitle>
        <CardDescription>{auth.account?.email}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <OrganizationContextSelector />
        <nav className="flex flex-wrap gap-3">
          {links.map(([name, href]) => (
            <Button
              key={href}
              variant="outline"
              nativeButton={false}
              render={<Link href={href} />}
            >
              {name}
            </Button>
          ))}
        </nav>
      </CardContent>
    </Card>
  )
}
