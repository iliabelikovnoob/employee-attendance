import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import ClientHeaderWrapper from '@/components/ClientHeaderWrapper';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 dark:bg-gray-950">
      <ClientHeaderWrapper user={session.user} />
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}
