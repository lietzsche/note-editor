import { useEffect, useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { api, type Note } from '../lib/api';

export default function SharedNotePage() {
  const { shareToken } = useParams<{ shareToken: string }>();
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!shareToken) return;
    api.shared.get(shareToken)
      .then(setNote)
      .catch((err) => {
        console.error(err);
        setError(err.message || '노트를 불러올 수 없습니다.');
      })
      .finally(() => setLoading(false));
  }, [shareToken]);

  if (loading) {
    return <div>로딩 중...</div>;
  }

  if (error || !note) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>{note.title}</h1>
      <div style={{ whiteSpace: 'pre-wrap', marginTop: '16px' }}>
        {note.content}
      </div>
      <p style={{ marginTop: '24px', color: '#666', fontSize: '14px' }}>
        이 노트는 공유 링크를 통해 접근되었습니다.
      </p>
    </div>
  );
}