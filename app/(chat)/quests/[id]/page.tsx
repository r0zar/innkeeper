import { auth } from '@/app/(auth)/auth';
import { redirect } from 'next/navigation';
import { QuestDetail } from '@/components/quest-detail';
import { getQuestById } from '@/lib/db/queries';

export default async function QuestDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const quest = await getQuestById({ id });

  // Check if quest exists and belongs to the user
  if (!quest || quest.userId !== session.user.id) {
    redirect('/quests');
  }

  return (
    <div className="flex-1 overflow-hidden">
      <div className="mx-auto max-w-5xl p-4 md:p-8 h-full">
        <QuestDetail quest={quest} />
      </div>
    </div>
  );
}