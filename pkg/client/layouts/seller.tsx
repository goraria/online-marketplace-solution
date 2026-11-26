"use client"

import Link from "next/link"
import { redirect, usePathname } from "next/navigation"
import type { ReactNode } from "react"

import { Package, Plus, ShoppingBag } from "@gorth/primitive/cores/lucide"
import { Button } from "@gorth/primitive/custom/button"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@gorth/primitive/custom/sidebar"
import { Header } from "@gorth/primitive/layouts/header"
import { useLayout } from "@gorth/primitive/providers/layout"

import { LoadingScreen } from "@/features/shared/loading"
import { useAuth } from "@/hooks/use-auth"

const navigation = [
  { href: "/seller/product", label: "My products", icon: Package },
  { href: "/seller/product/create", label: "Add product", icon: Plus },
]

export function SellerShell({ children, defaultOpen }: { children: ReactNode; defaultOpen: boolean }) {
  const auth = useAuth()
  const pathname = usePathname()
  const { collapsible, variant } = useLayout()

  if (auth.loading) return <LoadingScreen />
  if (!auth.authenticated) redirect("/")

  return (
    <SidebarProvider defaultOpen={defaultOpen} className="min-h-svh">
      <Sidebar collapsible={collapsible} variant={variant}>
        <SidebarHeader className="p-4">
          <Link href="/seller/product" className="flex items-center gap-2 font-semibold">
            <ShoppingBag className="size-5" /> Gorth Seller
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {navigation.map(({ href, label, icon: Icon }) => (
                  <SidebarMenuItem key={href}>
                    <SidebarMenuButton
                      render={<Link href={href} />}
                      isActive={pathname === href}
                      tooltip={label}
                    >
                      <Icon className="size-4" /> <span>{label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
      <SidebarInset className="min-w-0">
        <Header
          mode="dashboard"
          nav={{ main: [], secondary: [] }}
          auth={auth}
          user={{
            name: auth.account?.name ?? "Seller",
            email: auth.account?.email ?? "",
            avatar: auth.account?.image ?? "",
          }}
          left={<SidebarTrigger aria-label="Toggle seller navigation" />}
          right={<Button render={<Link href="/" />} variant="ghost">View store</Button>}
        />
        <main className="container mx-auto flex w-full min-w-0 flex-1 flex-col gap-6 p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
