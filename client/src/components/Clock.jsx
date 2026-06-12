import { useEffect, useState } from 'react';

/** Live clock for the ops header. Updates every second. */
export default function Clock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const time = now.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const date = now.toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="text-right leading-tight" aria-label="Current time">
      <div className="font-mono text-base font-semibold tabular-nums text-ops-text">
        {time}
      </div>
      <div className="text-[11px] uppercase tracking-wider text-ops-text-muted">{date}</div>
    </div>
  );
}
