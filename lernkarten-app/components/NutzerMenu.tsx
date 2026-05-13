'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useSitzung } from '@/lib/client/sitzung';

export default function NutzerMenu() {
  const router = useRouter();
  const { sitzung, abmelden } = useSitzung();
  const [arbeitet, setArbeitet] = useState(false);

  if (sitzung.status === 'laedt') {
    return (
      <div className="text-xs text-slate-400" aria-live="polite">
        …
      </div>
    );
  }

  if (sitzung.nutzer === null) {
    return (
      <div className="flex items-center gap-2">
        <Link
          href="/anmelden"
          className="text-sm text-blue-600 hover:text-blue-700 font-medium px-2 py-1 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          Anmelden
        </Link>
        <Link
          href="/nutzer"
          className="text-sm text-slate-600 hover:text-slate-900 px-2 py-1 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
        >
          Nutzer
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <Link
        href="/nutzer"
        className="text-slate-600 hover:text-slate-900 px-2 py-1 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
      >
        Nutzer
      </Link>
      <Link
        href={`/nutzer/${encodeURIComponent(sitzung.nutzer.name)}`}
        className="text-slate-900 font-medium px-2 py-1 rounded hover:bg-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        title="Eigenes Profil"
      >
        📚 {sitzung.nutzer.name}
        {sitzung.nutzer.hatPasswort ? (
          <span aria-label="Privat" title="Privat" className="ml-1">
            🔒
          </span>
        ) : null}
      </Link>
      <button
        type="button"
        disabled={arbeitet}
        onClick={async () => {
          setArbeitet(true);
          try {
            await abmelden();
            router.push('/');
          } finally {
            setArbeitet(false);
          }
        }}
        className="text-slate-500 hover:text-slate-900 px-2 py-1 rounded disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
      >
        Abmelden
      </button>
    </div>
  );
}
