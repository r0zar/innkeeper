import { auth } from '@/app/(auth)/auth';
import { redirect } from 'next/navigation';
import { QuestsList } from '@/components/quests-list';

export default async function QuestsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  return (
    <div className="flex-1 overflow-hidden">
      <div className="mx-auto max-w-7xl p-4 md:p-8 h-full">
        <h1 className="text-2xl font-bold mb-6">My Quests</h1>
        <QuestsList userId={session.user.id!} />
      </div>
    </div>
  );
}