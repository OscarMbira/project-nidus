import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import ChangeBoardDashboard from '../../components/change/ChangeBoardDashboard';

export default function ChangeBoard() {
  const { projectId, boardId } = useParams();
  const navigate = useNavigate();
  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (boardId) {
      loadBoard();
    }
  }, [boardId]);

  const loadBoard = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('change_board')
        .select('*')
        .eq('id', boardId)
        .eq('is_deleted', false)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setBoard(data);
    } catch (error) {
      console.error('Error loading change board:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Users className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              Change Board
              {board && (
                <span className="text-xl font-normal text-gray-500 dark:text-gray-400">
                  - {board.board_name}
                </span>
              )}
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Review and approve change requests
            </p>
          </div>
        </div>
      </div>

      <ChangeBoardDashboard projectId={projectId} boardId={boardId} />
    </div>
  );
}

