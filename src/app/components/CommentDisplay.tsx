interface Props {
  userName?: string;
  userComment?: string;
  aiResponse?: string;
}

export default function CommentDisplay({ userName, userComment, aiResponse }: Props) {
  if (!userComment) return null;

  return (
    <div className="bg-black/70 backdrop-blur-sm rounded-xl px-5 py-4 text-white max-w-2xl w-full shadow-xl">
      <div className="flex items-start gap-2 mb-2">
        <span className="text-yellow-400 font-bold shrink-0">{userName ?? 'Unknown'}</span>
        <span className="text-gray-200 leading-snug">{userComment}</span>
      </div>
      {aiResponse && (
        <div className="flex items-start gap-2 border-t border-white/10 pt-2">
          <span className="text-purple-400 font-bold shrink-0">アイ</span>
          <span className="text-white leading-snug">{aiResponse}</span>
        </div>
      )}
    </div>
  );
}
