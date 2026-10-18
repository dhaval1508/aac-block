import { RegisterForm } from "@/components/register-form";
import { Logo } from "@/components/logo";

export const dynamic = "force-dynamic";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-900 px-3 py-6 sm:px-4 sm:py-8 min-w-0 max-w-full">
      <div className="w-full max-w-xl rounded-3xl bg-white p-5 sm:p-8 shadow-2xl min-w-0">
        <div className="mb-6 flex flex-col items-center justify-center text-center">
          <div className="mb-3 flex items-center justify-center rounded-2xl bg-white p-3 border border-slate-100 shadow-sm">
            <Logo size="lg" />
          </div>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900">
            Customer Registration
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Register your company to place AAC block orders and access GST invoices.
          </p>
        </div>

        <RegisterForm error={params.error} />
      </div>
    </div>
  );
}
