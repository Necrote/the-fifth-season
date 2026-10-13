import { useEffect, useRef } from 'react';

export function EvidenceReveal({ opened, onOpen }: { opened: boolean; onOpen: () => void }) {
  const photograph = useRef<HTMLElement>(null);
  const previous = useRef(opened);
  useEffect(() => {
    if (opened && !previous.current) {
      photograph.current?.focus({ preventScroll: true });
      photograph.current?.scrollIntoView({ block: 'start' });
    }
    previous.current = opened;
  }, [opened]);
  return <div className={`evidence-reveal ${opened ? 'opened' : ''}`}>
    <button className="evidence-envelope-button" disabled={opened} aria-hidden={opened ? true : undefined} aria-expanded={opened} aria-label="Open the evidence envelope" onClick={onOpen}>
      <img src={`${import.meta.env.BASE_URL}images/props/sealed-envelope.webp`} alt="The sealed photograph envelope from the Memory Cabinet" width={1536} height={1024} />
      <span className="envelope-open-label"><span aria-hidden="true">◇</span> Break the seal</span>
    </button>
    {opened && <figure className="evidence-photo" ref={photograph} tabIndex={-1}>
      <img src={`${import.meta.env.BASE_URL}images/props/warden-evidence-photo.webp`} alt="Three friends celebrating their escape beside an open safe, mounted as a photograph from the warden’s evidence cabinet with its complete timestamp slip" width={1024} height={1536} decoding="async" />
      <figcaption>
        <span className="sr-only">Prison Break · Evidence 1026. October 26, 2025 · 11:15 AM · New York.</span>
        <p>One instant; two local times.</p>
      </figcaption>
    </figure>}
  </div>;
}
