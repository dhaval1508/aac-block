import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { Role } from "@prisma/client";
import { UsersManager, type ManagedUser, type CustomerInvitationItem } from "@/components/users-manager";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/login");

  const { error, success } = await searchParams;

  const [allUsers, pendingInvitations, salesmenList] = await Promise.all([
    prisma.user.findMany({
      where: {
        deletedAt: null,
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        mobile: true,
        email: true,
        role: true,
        active: true,
        salesmanCode: true,
        companyName: true,
        gstin: true,
        city: true,
        state: true,
        deliveryAddress: true,
        remarks: true,
        createdAt: true,
        salesmanId: true,
        salesman: { select: { id: true, name: true, salesmanCode: true } },
        _count: {
          select: {
            customerOrders: true,
            salesmanOrders: true,
            assignedCustomers: true,
            assignedOrders: true,
          },
        },
      },
    }),
    prisma.customerInvitation.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        salesman: { select: { id: true, name: true, salesmanCode: true } },
      },
    }),
    prisma.user.findMany({
      where: { role: Role.SALESMAN, deletedAt: null },
      select: { id: true, name: true, salesmanCode: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-6 lg:p-8 min-w-0 max-w-full">
      {error ? (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 px-4 py-3 text-xs sm:text-sm text-rose-700 font-medium">
          {decodeURIComponent(error)}
        </div>
      ) : null}

      {success ? (
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-xs sm:text-sm text-emerald-800 font-bold">
          {decodeURIComponent(success)}
        </div>
      ) : null}

      <UsersManager
        users={allUsers as ManagedUser[]}
        invitations={pendingInvitations as CustomerInvitationItem[]}
        salesmen={salesmenList}
        currentUserId={session.id}
      />
    </div>
  );
}
