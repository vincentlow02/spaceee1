export default function RefinementIcon({type,className = 'size-5'}) {
  const paths = {
    expand: <path d="M9 4H4v5m11-5h5v5M4 15v5h5m11-5v5h-5" />,
    download: <path d="M12 3v12m-5-5 5 5 5-5M4 16v4h16v-4" />,
    send: <path d="M12 20V4m-7 7 7-7 7 7" />,
    attach: <path d="M8 15V6a4 4 0 0 1 8 0v11a6 6 0 0 1-12 0V7m8 0v10a2 2 0 0 1-4 0" />,
    context: <><path d="m12 3 9 5-9 5-9-5 9-5ZM3 13l9 5 9-5M3 17l9 5 9-5" /></>,
    sparkle: <><path d="m9 3 2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5Zm10 10 1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3Z" /></>,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    more: <><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>,
  };
  return <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[type]}</svg>;
}
