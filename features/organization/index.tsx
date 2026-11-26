"use client"
import { useState, type ComponentProps } from "react"
import { DataTable } from "@gorth-com/primitive/custom/data-table"
import { Button } from "@gorth-com/primitive/custom/button"
import { Input } from "@gorth-com/primitive/default/input"
import { Label } from "@gorth-com/primitive/default/label"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@gorth-com/primitive/default/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@gorth-com/primitive/default/dialog"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@gorth-com/primitive/default/select"
import { OrganizationContextSelector } from "@/components/organization/context-selector"
import {
  useOrganizationContext,
  useOrganizationQuery,
  useOrganizationMutation,
} from "@/queries/organization"
interface Row {
  id: string
  name?: string
  email?: string
  role?: string
  canManage?: boolean
  status?: string
  userId?: string
  user?: { id: string; name: string; email: string }
}
interface Form {
  operation: string
  title: string
  fields: Array<{
    key: string
    label: string
    initial?: string
    options?: Array<{ value: string; label: string }>
    type?: string
  }>
  fixed: Record<string, unknown>
  confirm?: string
}
export function OrganizationWorkspace({
  initialSection = "organization",
}: {
  initialSection?: string
}) {
  const context = useOrganizationContext(),
    mutation = useOrganizationMutation()
  const [section, setSection] = useState(initialSection),
    [form, setForm] = useState<Form | null>(null),
    [error, setError] = useState(""),
    [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 })
  const org = context.data?.organizations.find(
      (o) => o.id === context.data?.selected.organizationId
    ),
    team = org?.teams.find((t) => t.id === context.data?.selected.teamId)
  const members = useOrganizationQuery<{ members: Row[]; total: number }>(
    "member",
    {
      organizationId: org?.id,
      limit: pagination.pageSize,
      offset: pagination.pageIndex * pagination.pageSize,
    },
    !!org && section === "member"
  )
  const teams = useOrganizationQuery<Row[]>(
    "team-member",
    { teamId: team?.id },
    !!team && section === "team-member"
  )
  const invites = useOrganizationQuery<Row[]>(
    "invitation",
    { organizationId: org?.id },
    !!org && section === "invitation"
  )
  const myInvites = useOrganizationQuery<Row[]>(
    "my-invitation",
    {},
    section === "my-invitation"
  )
  const roles = [
    "member",
    "manager",
    "staff",
    "catalog",
    "inventory",
    "fulfillment",
    "finance",
    "support",
    "viewer",
  ].map((value) => ({ value, label: value }))
  const items: Row[] =
    section === "organization"
      ? (context.data?.organizations ?? [])
      : section === "team"
        ? (org?.teams ?? [])
        : section === "member"
          ? (members.data?.members ?? [])
          : section === "team-member"
            ? Array.isArray(teams.data)
              ? teams.data
              : []
            : section === "invitation"
              ? (invites.data ?? [])
              : (myInvites.data ?? [])
  const queryError =
    context.error ??
    members.error ??
    teams.error ??
    invites.error ??
    myInvites.error
  const canManageTeam = org?.canManage || team?.actions.includes("manage")
  const orgRoles = ["member", "admin", "owner"].map((value) => ({
    value,
    label: value,
  }))
  function confirm(
    operation: string,
    title: string,
    fixed: Record<string, unknown>,
    text: string
  ) {
    setForm({ operation, title, fixed, confirm: text, fields: [] })
  }
  const columns: ComponentProps<typeof DataTable<Row>>["columns"] = [
    {
      id: "name",
      header: "Name",
      cell: ({ row }) => (
        <div>
          <div className="font-medium">
            {row.original.user?.name ??
              row.original.name ??
              row.original.email ??
              row.original.userId ??
              row.original.id}
          </div>
          <div className="text-xs text-muted-foreground">
            {row.original.user?.email ?? row.original.email ?? row.original.id}
          </div>
        </div>
      ),
    },
    {
      id: "role",
      header: "Role / status",
      cell: ({ row }) => row.original.role ?? row.original.status ?? "—",
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const item = row.original
        return (
          <div className="flex flex-wrap gap-2">
            {section === "organization" && (
              <>
                <Button
                  variant="outline"
                  onClick={() =>
                    mutation.mutate({
                      operation: "context",
                      body: { organizationId: item.id, teamId: null },
                    })
                  }
                >
                  Select
                </Button>
                {item.canManage && (
                  <Button
                    variant="outline"
                    onClick={() =>
                      setForm({
                        operation: "update",
                        title: "Rename organization",
                        fixed: { organizationId: item.id },
                        fields: [
                          { key: "name", label: "Name", initial: item.name },
                        ],
                      })
                    }
                  >
                    Rename
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() =>
                    confirm(
                      "leave",
                      "Leave organization",
                      { organizationId: item.id },
                      "You will lose access to this organization. Better Auth protects the last owner."
                    )
                  }
                >
                  Leave
                </Button>
              </>
            )}
            {section === "team" && (
              <Button
                variant="outline"
                onClick={() =>
                  mutation.mutate({
                    operation: "context",
                    body: { organizationId: org!.id, teamId: item.id },
                  })
                }
              >
                Select
              </Button>
            )}
            {section === "team" && org?.canManage && (
              <>
                <Button
                  variant="outline"
                  onClick={() =>
                    setForm({
                      operation: "team-update",
                      title: "Rename branch",
                      fixed: { teamId: item.id },
                      fields: [
                        { key: "name", label: "Name", initial: item.name },
                      ],
                    })
                  }
                >
                  Edit
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    confirm(
                      "team-remove",
                      "Remove branch",
                      { organizationId: org.id, teamId: item.id },
                      "Remove this SSO team? Its Commerce data remains protected and will require an explicit migration before reuse."
                    )
                  }
                >
                  Remove
                </Button>
              </>
            )}
            {section === "member" && org?.canManage && (
              <>
                {team && item.role === "member" && (
                  <Button
                    variant="outline"
                    onClick={() =>
                      confirm(
                        "team-member-add",
                        "Assign to branch",
                        {
                          teamId: team.id,
                          userId: item.userId ?? item.user?.id,
                        },
                        "Add this member to " +
                          team.name +
                          "? The initial branch role is member."
                      )
                    }
                  >
                    Assign to branch
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() =>
                    setForm({
                      operation: "member-role",
                      title: "Change organization role",
                      fixed: { organizationId: org.id, memberId: item.id },
                      fields: [
                        {
                          key: "role",
                          label: "Role",
                          initial: item.role,
                          options: orgRoles,
                        },
                      ],
                    })
                  }
                >
                  Role
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    confirm(
                      "member-remove",
                      "Remove member",
                      { organizationId: org.id, memberIdOrEmail: item.id },
                      "This member will lose organization access. Better Auth protects the last owner."
                    )
                  }
                >
                  Remove
                </Button>
              </>
            )}
            {section === "team-member" && canManageTeam && (
              <Button
                variant="outline"
                onClick={() =>
                  setForm({
                    operation: "team-member-role",
                    title: "Change branch role",
                    fixed: {
                      teamId: team!.id,
                      userId: item.userId ?? item.user?.id,
                    },
                    fields: [
                      {
                        key: "role",
                        label: "Role",
                        initial: item.role ?? "member",
                        options: org?.canManage
                          ? roles
                          : roles.filter((r) => r.value !== "manager"),
                      },
                    ],
                  })
                }
              >
                Role
              </Button>
            )}
            {section === "team-member" && org?.canManage && (
              <Button
                variant="outline"
                onClick={() =>
                  confirm(
                    "team-member-remove",
                    "Remove from branch",
                    {
                      organizationId: org.id,
                      teamId: team!.id,
                      userId: item.userId ?? item.user?.id,
                    },
                    "Remove branch access while preserving organization membership?"
                  )
                }
              >
                Remove
              </Button>
            )}
            {section === "invitation" &&
              org?.canManage &&
              item.status === "pending" && (
                <Button
                  variant="outline"
                  onClick={() =>
                    confirm(
                      "invitation-cancel",
                      "Cancel invitation",
                      { invitationId: item.id },
                      "Cancel this pending invitation?"
                    )
                  }
                >
                  Cancel
                </Button>
              )}
            {section === "my-invitation" && item.status === "pending" && (
              <>
                <Button
                  onClick={() =>
                    confirm(
                      "invitation-accept",
                      "Accept invitation",
                      { invitationId: item.id },
                      "Join this organization as a member?"
                    )
                  }
                >
                  Accept
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    confirm(
                      "invitation-reject",
                      "Reject invitation",
                      { invitationId: item.id },
                      "Reject this invitation?"
                    )
                  }
                >
                  Reject
                </Button>
              </>
            )}
          </div>
        )
      },
    },
  ]
  function create() {
    if (section === "organization")
      setForm({
        operation: "create",
        title: "Create organization",
        fixed: {},
        fields: [
          { key: "name", label: "Name" },
          { key: "slug", label: "Slug" },
        ],
      })
    if (section === "team" && org?.canManage)
      setForm({
        operation: "team-create",
        title: "Create branch",
        fixed: { organizationId: org.id },
        fields: [{ key: "name", label: "Name" }],
      })
    if ((section === "member" || section === "invitation") && org?.canManage)
      setForm({
        operation: "invitation-create",
        title: "Invite member",
        fixed: {
          organizationId: org.id,
          role: "member",
          ...(team ? { teamId: team.id } : {}),
        },
        fields: [{ key: "email", label: "Email", type: "email" }],
      })
    if (section === "team-member" && org?.canManage && team) {
      setSection("member")
      setPagination({ pageIndex: 0, pageSize: 20 })
    }
  }
  const hasCreate =
    section === "organization" ||
    (!!org?.canManage && ["team", "member", "invitation"].includes(section)) ||
    (section === "team-member" && org?.canManage && !!team)
  return (
    <section className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Organization & branch</CardTitle>
          <CardDescription>
            SSO manages membership and permissions. Organization owner/admin can
            select every branch without a team assignment.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OrganizationContextSelector />
        </CardContent>
      </Card>
      <div className="flex flex-wrap gap-2">
        {[
          "organization",
          "team",
          "member",
          "team-member",
          "invitation",
          "my-invitation",
        ].map((value) => (
          <Button
            key={value}
            variant={value === section ? "default" : "outline"}
            onClick={() => {
              setSection(value)
              setPagination({ pageIndex: 0, pageSize: 20 })
            }}
          >
            {value.replaceAll("-", " ")}
          </Button>
        ))}
      </div>
      {queryError && (
        <p role="alert" className="text-destructive">
          {queryError.message}
        </p>
      )}
      {!org && !["organization", "my-invitation"].includes(section) ? (
        <p>Select an organization above.</p>
      ) : section === "team-member" && !team ? (
        <p>Select a branch above.</p>
      ) : (
        <DataTable
          columns={columns}
          data={
            section === "member"
              ? items
              : items.slice(
                  pagination.pageIndex * pagination.pageSize,
                  (pagination.pageIndex + 1) * pagination.pageSize
                )
          }
          rowCount={
            section === "member" ? (members.data?.total ?? 0) : items.length
          }
          pagination={pagination}
          onPaginationChange={setPagination}
          enableRowSelection={false}
          loading={
            context.isFetching ||
            members.isFetching ||
            teams.isFetching ||
            invites.isFetching ||
            myInvites.isFetching
          }
          onReload={() => {
            void context.refetch()
            if (section === "member") void members.refetch()
            if (section === "team-member") void teams.refetch()
            if (section === "invitation") void invites.refetch()
            if (section === "my-invitation") void myInvites.refetch()
          }}
          onCreate={hasCreate ? create : undefined}
        />
      )}
      <Dialog
        open={!!form}
        onOpenChange={(open) => {
          if (!open && !mutation.isPending) {
            setForm(null)
            setError("")
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form?.title}</DialogTitle>
            <DialogDescription>
              {form?.confirm ??
                "Changes are checked by SSO using your current permissions."}
            </DialogDescription>
          </DialogHeader>
          {form && (
            <form
              key={form.operation + JSON.stringify(form.fixed)}
              className="space-y-4"
              onSubmit={async (e) => {
                e.preventDefault()
                setError("")
                const fields = Object.fromEntries(new FormData(e.currentTarget))
                const body = ["team-update", "update"].includes(form.operation)
                  ? { ...form.fixed, data: fields }
                  : { ...form.fixed, ...fields }
                try {
                  await mutation.mutateAsync({
                    operation: form.operation,
                    body,
                  })
                  setForm(null)
                } catch (error) {
                  setError(
                    error instanceof Error ? error.message : "Request failed"
                  )
                }
              }}
            >
              {form.fields.map((field) => (
                <div key={field.key} className="space-y-2">
                  <Label htmlFor={"org-" + field.key}>{field.label}</Label>
                  {field.options ? (
                    <Select
                      name={field.key}
                      defaultValue={field.initial ?? field.options[0]?.value}
                    >
                      <SelectTrigger id={"org-" + field.key}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {field.options.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      id={"org-" + field.key}
                      name={field.key}
                      type={field.type ?? "text"}
                      defaultValue={field.initial}
                      required
                    />
                  )}
                </div>
              ))}
              {error && (
                <p role="alert" className="text-destructive">
                  {error}
                </p>
              )}
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Saving…" : "Confirm"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </section>
  )
}
