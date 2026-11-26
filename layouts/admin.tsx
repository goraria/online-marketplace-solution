"use client"

import Link from "next/link"
import { AppBrand } from "@/components/app-brand"
import { appGlobal } from "@/utils/constant"
import { usePathname, redirect } from "next/navigation"
import type { ReactNode } from "react"
import {
  Boxes,
  FolderTree,
  PackageCheck,
  PackageOpen,
  ListOrdered,
  Package,
  Store,
  Tags,
  Undo2,
  Users,
  Warehouse,
} from "@gorth-com/primitive/cores/lucide"
import { Button } from "@gorth-com/primitive/custom/button"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@gorth-com/primitive/custom/sidebar"
import { Header } from "@gorth-com/primitive/layouts/header"
import { useLayout } from "@gorth-com/primitive/providers/layout"

import { LoadingScreen } from "@/features/shared/loading"
import { useAuth } from "@/hooks/use-auth"
import { useUser } from "@/hooks/use-user"

const navigation = [
  { href: "/admin/category", label: "Category", icon: FolderTree },
  { href: "/admin/product", label: "Product", icon: Package },
  { href: "/admin/brand", label: "Brand", icon: Tags },
  { href: "/admin/store", label: "Store", icon: Store },
  { href: "/admin/seller", label: "Seller", icon: Users },
  { href: "/admin/listing", label: "Listing", icon: Boxes },
  { href: "/admin/order", label: "Order", icon: ListOrdered },
  { href: "/admin/customer", label: "Customer", icon: Users },
  { href: "/admin/warehouse", label: "Warehouse", icon: Warehouse },
  { href: "/admin/inventory", label: "Inventory", icon: PackageOpen },
  { href: "/admin/fulfillment", label: "Fulfillment", icon: PackageCheck },
  { href: "/admin/return", label: "Return", icon: Undo2 },
]

export function AdminShell({
  children,
  defaultOpen,
}: {
  children: ReactNode
  defaultOpen: boolean
}) {
  const auth = useAuth()
  const local = useUser()
  const pathname = usePathname()
  const { collapsible, variant } = useLayout()

  if (local.loading) return <LoadingScreen />
  if (
    !auth.authenticated ||
    !local.user ||
    !["admin", "master"].includes(local.user.role ?? "")
  ) {
    redirect("/")
  }

  const user = {
    name: local.user.name,
    email: local.user.email,
    avatar: local.user.image ?? "",
  }

  return (
    <SidebarProvider defaultOpen={defaultOpen} className="min-h-svh">
      <Sidebar collapsible={collapsible} variant={variant}>
        <SidebarHeader className="p-4">
          <Link
            href="/admin/category"
            className="flex items-center gap-2 font-semibold"
          >
            <AppBrand />
            {appGlobal.name}
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Catalog & commerce</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navigation.map(({ href, label, icon: Icon }) => (
                  <SidebarMenuItem key={href}>
                    <SidebarMenuButton
                      render={<Link href={href} />}
                      isActive={pathname === href}
                      tooltip={label}
                    >
                      <Icon className="size-4" />
                      <span>{label}</span>
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
          user={user}
          auth={auth}
          left={<SidebarTrigger aria-label="Toggle sidebar" />}
          right={
            <Button
              nativeButton={false}
              render={<Link href="/" />}
              variant="ghost"
            >
              View store
            </Button>
          }
        />
        <main className="container mx-auto flex w-full min-w-0 flex-1 flex-col gap-6 p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
