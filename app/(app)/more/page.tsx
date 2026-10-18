import Link from "next/link";
import { Boxes, LogOut, Settings, Truck, Users } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { InstallAppButton } from "@/components/pwa";
import { logoutAction } from "@/lib/actions/auth";
import { getSession } from "@/lib/session";

export default async function MorePage() {
  const session = await getSession();

  return (
    <div>
      <PageHeader title="More" />
      <div className="space-y-3 p-4">
        <InstallAppButton variant="card" />

        <Link href="/stock" className="card flex items-center gap-3 p-4">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
            <Boxes className="h-5 w-5" />
          </span>
          <div>
            <p className="font-semibold text-navy">Stock</p>
            <p className="text-sm text-slate-500">Stock in, stock out and summary</p>
          </div>
        </Link>
        <Link href="/transport" className="card flex items-center gap-3 p-4">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
            <Truck className="h-5 w-5" />
          </span>
          <div>
            <p className="font-semibold text-navy">Transport & Dispatch</p>
            <p className="text-sm text-slate-500">Active trips and delivery history</p>
          </div>
        </Link>
        <Link href="/settings" className="card flex items-center gap-3 p-4">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
            <Settings className="h-5 w-5" />
          </span>
          <div>
            <p className="font-semibold text-navy">Settings</p>
            <p className="text-sm text-slate-500">Users, roles and products</p>
          </div>
        </Link>
        <Link href="/customers" className="card flex items-center gap-3 p-4 lg:hidden">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
            <Users className="h-5 w-5" />
          </span>
          <div>
            <p className="font-semibold text-navy">Customers</p>
            <p className="text-sm text-slate-500">Address, location and contact</p>
          </div>
        </Link>

        <div className="card p-4">
          <p className="text-sm font-semibold">{session?.name}</p>
          <p className="text-xs text-slate-500">
            {session?.email} · {session?.role}
          </p>
          <form action={logoutAction}>
            <button className="mt-3 flex items-center gap-2 text-sm font-semibold text-rose-600">
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
