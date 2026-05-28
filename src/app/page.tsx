import dynamic from 'next/dynamic';

const VTuberOverlay = dynamic(
  () => import('@/app/components/VTuberOverlay'),
  { ssr: false }
);

interface Props {
  searchParams: Promise<{ videoId?: string }>;
}

export default async function Home({ searchParams }: Props) {
  const { videoId } = await searchParams;
  const resolvedVideoId = videoId ?? process.env.YOUTUBE_VIDEO_ID ?? '';

  if (!resolvedVideoId) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="bg-black/80 text-white rounded-xl p-8 max-w-md text-center space-y-2">
          <p className="text-lg font-semibold">Video ID が設定されていません</p>
          <p className="text-sm text-gray-400">
            OBSブラウザソースのURLに{' '}
            <code className="text-purple-400">?videoId=VIDEO_ID</code> を追加するか、
            環境変数 <code className="text-purple-400">YOUTUBE_VIDEO_ID</code> を設定してください。
          </p>
        </div>
      </div>
    );
  }

  return <VTuberOverlay videoId={resolvedVideoId} />;
}
