import React from 'react';

export interface LogViewerProps {
  logs: string[];
  maxHeight?: string;
  autoScroll?: boolean;
}

export const LogViewer: React.FC<LogViewerProps> = ({
  logs,
  maxHeight = '320px',
  autoScroll = true
}) => {
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-lg overflow-hidden flex flex-col font-mono">
      <div className="bg-slate-900/90 px-3 py-1.5 border-b border-slate-800 flex justify-between items-center text-xs text-slate-400">
        <span className="font-semibold uppercase tracking-wider flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
          SIP Protocol Stream & Engine Output
        </span>
        <span>{logs.length} entries</span>
      </div>
      <div
        ref={containerRef}
        style={{ maxHeight }}
        className="p-3 overflow-y-auto text-xs space-y-1 select-text scrollbar-thin scrollbar-thumb-slate-800"
      >
        {logs.length === 0 ? (
          <div className="text-slate-600 italic">No logs recorded yet.</div>
        ) : (
          logs.map((log, index) => {
            let color = 'text-slate-300';
            if (log.includes('[OUT]')) color = 'text-cyan-400';
            if (log.includes('[IN ]')) color = 'text-blue-400';
            if (log.includes('[SIMULATED]')) color = 'text-purple-400';
            if (log.includes('200 OK')) color = 'text-emerald-400 font-semibold';
            if (log.includes('401') || log.includes('407')) color = 'text-amber-400';
            if (log.includes('Error') || log.includes('Failed')) color = 'text-rose-400 font-semibold';

            return (
              <div key={index} className={`leading-relaxed whitespace-pre-wrap ${color}`}>
                <span className="text-slate-600 select-none mr-2">[{String(index + 1).padStart(3, '0')}]</span>
                {log}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
