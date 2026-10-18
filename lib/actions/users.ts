"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { canManageUsers } from "@/lib/utils";

export async function createUserAction(formData: FormData) {
  const session = await getSession();
  if (!session || !canManageUsers(session.role)) {
    redirect("/login");
  }

  const name = String(formData.get("name") ?? "").trim();
  const mobile = String(formData.get("mobile") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "STAFF") as Role;

  if (!name || !mobile || !email || password.length < 6) {
    redirect("/admin/users?error=Name,%20mobile,%20email%20and%206+%20char%20password%20required");
  }

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { mobile }] },
  });
  if (existing) {
    redirect("/admin/users?error=Email%20or%20mobile%20already%20registered");
  }

  await prisma.user.create({
    data: {
      name,
      mobile,
      email,
      role,
      passwordHash: await bcrypt.hash(password, 10),
      companyName: "Swarnim AAC Block Pvt. Ltd.",
    },
  });

  revalidatePath("/admin/users");
  redirect("/admin/users");
}

export async function toggleUserAction(formData: FormData) {
  const session = await getSession();
  if (!session || !canManageUsers(session.role)) {
    redirect("/login");
  }

  const id = String(formData.get("id") ?? "");
  if (id === session.id) {
    redirect("/admin/users?error=You%20cannot%20disable%20yourself");
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) redirect("/admin/users");

  await prisma.user.update({
    where: { id },
    data: { active: !user.active },
  });

  revalidatePath("/admin/users");
  redirect("/admin/users");
}
