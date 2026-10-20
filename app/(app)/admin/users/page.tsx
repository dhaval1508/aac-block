import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { Role } from "@prisma/client";
import { UsersManager, type InternalUser, type CustomerUser } from "@/components/users-manager";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/login");

  const { error } = await searchParams;

  const [internalUsers, customers] = await Promise.all([
    prisma.user.findMany({
      where: {
        role: { in: [Role.ADMIN, Role.STOCKER, Role.STAFF] },
        deletedAt: null,
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        mobile: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
      },
    }),
    prisma.user.findMany({
      where: {
        role: Role.CUSTOMER,
        deletedAt: null,
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        companyName: true,
        gstin: true,
        mobile: true,
        email: true,
        city: true,
        state: true,
        active: true,
        createdAt: true,
        _count: { select: { customerOrders: true } },
      },
    }),
  ]);

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-6 min-w-0 max-w-full">
      {error ? (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700 font-medium">
          {decodeURIComponent(error)}
        </div>
      ) : null}

      <UsersManager
        internalUsers={internalUsers as InternalUser[]}
        customers={customers as CustomerUser[]}
        currentUserId={session.id}
      />
    </div>
  );
}
