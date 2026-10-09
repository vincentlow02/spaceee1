'use client';

import * as Popover from '@radix-ui/react-popover';
import Link from 'next/link';

export default function SidebarAccount({compact = false}) {
  return <Popover.Root>
    <Popover.Trigger asChild>
      <button type="button" aria-label="Guest account information" title={compact ? 'Guest · Local profile' : undefined} className={`flex w-full items-center rounded-xl py-2 text-left transition-colors hover:bg-[#f7f7f7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-spacee-muted ${compact ? 'justify-center' : 'gap-2 px-1'}`}>
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#fa9283] text-sm font-medium text-white" aria-hidden="true">G</span>
        {!compact && <><span className="min-w-0 flex-1"><span className="block text-sm font-medium text-spacee-ink">Guest</span><span className="block whitespace-nowrap text-[11px] leading-5 text-spacee-muted">Local profile</span></span><svg className="size-[18px] shrink-0 text-spacee-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="m9 3-.6 2.3-2 .9-2.1-.6-2 3.4 1.5 1.7v2.6L2.3 15l2 3.4 2.1-.6 2 .9L9 21h4l.6-2.3 2-.9 2.1.6 2-3.4-1.5-1.7v-2.6l1.5-1.7-2-3.4-2.1.6-2-.9L13 3Z"/><circle cx="11" cy="12" r="3"/></svg></>}
      </button>
    </Popover.Trigger>
    <Popover.Portal><Popover.Content side="top" align="start" sideOffset={12} collisionPadding={16} className="z-[60] w-56 rounded-xl border border-spacee-line bg-white p-4 font-sans text-xs text-spacee-ink shadow-lg outline-none">
      <p className="mb-2 font-medium">Guest · Local profile</p><span className="text-spacee-muted">Account placeholder — sign-in is not connected yet.</span>
      <nav className="mt-4 flex flex-col gap-3" aria-label="Development tools"><Link href="/recognition-test">Recognition test</Link><Link href="/spacee-prototype">Position prototype</Link><Link href="/generation-preview">Result design preview</Link></nav>
      <Popover.Close className="mt-4 cursor-pointer text-spacee-muted">Close</Popover.Close>
    </Popover.Content></Popover.Portal>
  </Popover.Root>;
}
