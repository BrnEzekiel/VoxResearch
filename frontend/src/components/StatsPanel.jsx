import { useMemo } from "react";

const STOP = new Set("the,a,an,and,or,of,to,in,on,for,with,what,how,why,when,where,which,who,is,are,was,were,do,does,did,can,could,should,would,will,please,tell,me,my,show,give,explain,about,vs,vs.,i,you,we,it,this,that-those,these,as,at,by,from,into,than,too,very,new,chat,untitled".split(","));

function domainOf(url) {
  try {
    const h = new URL(url).hostname.replace(/^www\./, "");
    return h || null;
  } catch { return null; }
}

export default function StatsPanel({ sessions, dark, onClose }) {
  const stats = useMemo(() => {
    const turns = (sessions || []).flatMap(s => s.turns || []);
    const words = turns.reduce((n, t) => n + String(t.answer || "").split(/\s+/).filter(Boolean).length, 0);
    const cites = turns.reduce((n, t) => n + ((t.citations || []).length), 0);
    const grounded = turns.filter(t => t.grounded).length;
    const domains = {};
    turns.forEach(t => (t.citations || []).forEach(c => {
      const d = c.url && domainOf(c.url);
      if (d) domains[d] = (domains[d] || 0) + 1;
    }));
    const topDomains = Object.entries(domains).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const topicCounts = {};
    turns.forEach(t => String(t.query || "").toLowerCase().replace(/[^a-z\s]/g, "").split(/\s+/)
      .filter(w => w.length > 3 && !STOP.has(w))
      .forEach(w => { topicCounts[w] = (topicCounts[w] || 0) + 1; }));
    const topics = Object.entries(topicCounts).sort((a, b) => b[1] - a[1]).slice(0, 6);
    return { chats: (sessions || []).length, questions: turns.length, words, cites, grounded, topDomains, topics };
  }, [sessions]);

  const card = dark ? "bg-gray-950 border-gray-800" : "bg-white border-gray-100";
  const num = dark ? "text-gray-100" : "text-gray-900";
  const lbl = dark ? "text-gray-500" : "text-gray-400";
  const chip = dark ? "bg-gray-800 text-gray-300" : "bg-orange-50 text-orange-700";

  const cells = [
    [stats.questions, "questions asked"],
    [stats.words.toLocaleString(), "answer words"],
    [stats.cites, "citations collected"],
    [`${stats.questions ? Math.round((stats.grounded / stats.questions) * 100) : 0}%`, "answers grounded"],
  ];

  return (
    <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4" onClick={onClose}>
      <div className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl ${card}`} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={`font-bold text-lg ${num}`}>📊 Your research stats</h3>
          <button onClick={onClose} className={`text-xs px-2 py-1 rounded-lg ${dark ? "text-gray-500 hover:text-gray-200" : "text-gray-400 hover:text-gray-700"}`}>✕ Close</button>
        </div>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {cells.map(([v, l], i) => (
            <div key={i} className={`rounded-xl px-4 py-3 ${dark ? "bg-gray-900" : "bg-gray-50"}`}>
              <p className={`text-2xl font-bold ${num}`}>{v}</p>
              <p className={`text-xs ${lbl}`}>{l}</p>
            </div>
          ))}
        </div>
        {stats.topics.length > 0 && (
          <>
            <p className={`text-xs font-semibold uppercase tracking-widest mb-2 ${lbl}`}>Top topics</p>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {stats.topics.map(([w, n]) => (
                <span key={w} className={`text-xs px-2.5 py-1 rounded-full ${chip}`}>{w} ×{n}</span>
              ))}
            </div>
          </>
        )}
        {stats.topDomains.length > 0 && (
          <>
            <p className={`text-xs font-semibold uppercase tracking-widest mb-2 ${lbl}`}>Most-cited sources</p>
            <div className="space-y-1.5">
              {stats.topDomains.map(([d, n]) => (
                <div key={d} className="flex items-center gap-2">
                  <img src={`https://www.google.com/s2/favicons?domain=${d}&sz=32`} className="w-3.5 h-3.5 rounded" alt="" onError={e => e.target.style.display = "none"} />
                  <span className={`text-xs flex-1 truncate ${num}`}>{d}</span>
                  <span className={`text-xs ${lbl}`}>×{n}</span>
                </div>
              ))}
            </div>
          </>
        )}
        {stats.questions === 0 && <p className={`text-sm ${lbl}`}>Ask your first question and your stats will haunt this panel. 👻</p>}
      </div>
    </div>
  );
}
