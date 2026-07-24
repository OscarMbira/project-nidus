/**
 * Learning Path
 * Structured curriculum with modules, progress tracking.
 * Route: /simulator/learning-path
 */
import { useState, useEffect } from 'react';
import { BookOpen, CheckCircle, Lock, ChevronRight } from 'lucide-react';
import { simDb } from '../../services/supabase/supabaseClient';
import { useNavigate } from 'react-router-dom';

export default function LearningPath() {
  const [modules,setModules]=useState([]); const [loading,setLoading]=useState(true);
  const navigate=useNavigate();

  useEffect(()=>{
    simDb.from('learning_path_modules').select('id,title,description,estimated_minutes,order_index,is_published,prerequisite_module_id').eq('is_deleted',false).order('order_index')
      .then(({data})=>{ setModules(data??[]); setLoading(false); });
  },[]);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-6">
      <div className="flex items-center gap-3 mb-6"><BookOpen size={22} className="text-blue-400"/><div><h1 className="text-2xl font-bold">Learning Path</h1><p className="text-gray-400 text-sm">Your structured curriculum for project management mastery.</p></div></div>
      {loading?<div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"/></div>
      :modules.length===0?<div className="rounded-lg border border-gray-700 bg-gray-800 p-10 text-center text-gray-400 text-sm">No learning modules available yet. Check back soon.</div>
      :(
        <div className="space-y-3 max-w-2xl">
          {modules.map((m,i)=>(
            <button key={m.id} onClick={()=>navigate(`/simulator/learning-path/${m.id}`)}
              className={`w-full text-left rounded-lg border p-4 flex items-center gap-4 transition-colors ${m.is_published?'border-gray-600 bg-gray-800 hover:bg-gray-700':'border-gray-700 bg-gray-800/50 opacity-60 cursor-not-allowed'}`}
              disabled={!m.is_published}>
              <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${m.is_published?'bg-blue-600':'bg-gray-700'}`}>
                {m.is_published?<span className="text-sm font-bold">{i+1}</span>:<Lock size={14} className="text-gray-400"/>}
              </div>
              <div className="flex-1">
                <p className="font-medium">{m.title}</p>
                {m.description&&<p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{m.description}</p>}
                {m.estimated_minutes&&<p className="text-xs text-gray-500 mt-1">~{m.estimated_minutes} min</p>}
              </div>
              <ChevronRight size={16} className="text-gray-500 flex-shrink-0"/>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
