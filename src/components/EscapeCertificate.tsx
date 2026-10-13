import { useEffect, useState } from 'react';

const artworkUrl = `${import.meta.env.BASE_URL}images/props/certificate-art.webp`;
export function EscapeCertificate({ duration }: { duration: string }) {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [prepared, setPrepared] = useState<{ file: File; url: string } | null>(null);
  const [sharing, setSharing] = useState(false);
  useEffect(() => () => { if (prepared) URL.revokeObjectURL(prepared.url); }, [prepared]);
  const download = (url: string) => {
    const link = document.createElement('a'); link.download = 'the-fifth-season-certificate.png'; link.href = url;
    // Safari handles an attached link more reliably. Keep its URL alive for retries.
    document.body.append(link); link.click(); link.remove();
  };
  const save = async () => {
    if (prepared) { download(prepared.url); return; }
    setExporting(true); setError('');
    try {
      const image = new Image(); image.src = artworkUrl; await image.decode();
      const canvas = document.createElement('canvas'); canvas.width = 1800; canvas.height = 1200;
      const context = canvas.getContext('2d'); if (!context) throw new Error('Canvas unavailable');
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      context.fillStyle = '#173f46'; context.textAlign = 'center';
      context.font = '74px Georgia'; context.fillText('THE FIFTH SEASON', 900, 340);
      context.font = '58px Georgia'; context.fillText('You Escaped!', 900, 412);
      context.font = '30px Georgia'; context.fillText('Happy Birthday!', 900, 570);
      context.font = '38px Georgia'; context.fillText('Two cities. Two prisoners. Same team.', 900, 650);
      context.font = '34px Georgia'; context.fillText(`Elapsed time · ${duration}`, 900, 750);
      context.font = '28px Georgia'; context.fillText('8 puzzles solved', 900, 807);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('PNG unavailable');
      const url = URL.createObjectURL(blob);
      setPrepared({ file: new File([blob], 'the-fifth-season-certificate.png', { type: 'image/png' }), url });
      download(url);
    } catch { setError('The certificate artwork could not be loaded. Please try again.'); }
    finally { setExporting(false); }
  };
  let canShare = false;
  try { canShare = !!prepared && !!navigator.share && !!navigator.canShare?.({ files: [prepared.file] }); } catch { /* Use the PNG links instead. */ }
  const share = async () => {
    if (!prepared || sharing) return;
    setSharing(true); setError('');
    try {
      // The PNG is already prepared: call share directly in this tap's activation.
      await navigator.share({ files: [prepared.file], title: 'The Fifth Season' });
    } catch (failure) {
      if (!(failure instanceof DOMException && failure.name === 'AbortError')) setError('Sharing is unavailable. Use Open PNG to save the image instead.');
    } finally { setSharing(false); }
  };
  return <div className="certificate-panel">
    <details><summary>Preview certificate</summary><figure className="certificate-preview">
      <img src={artworkUrl} alt="An ornate illustrated certificate border with flowers, wheat, fruit and snow-covered boughs" width={1536} height={1024} />
      <figcaption><h3>The Fifth Season</h3><span>You Escaped!</span><strong>Happy Birthday!</strong><p>Two cities. Two prisoners. Same team.</p><small>Elapsed time · {duration}<br />8 puzzles solved</small></figcaption>
    </figure></details>
    <button className="button primary" disabled={exporting} onClick={() => void save()}>{exporting ? 'Preparing certificate…' : 'Save certificate PNG'}</button>
    {prepared && <>
      <div className="certificate-save-options">
        {canShare && <button className="button quiet" disabled={sharing} onClick={() => void share()}>Share or save image</button>}
        <a className="button quiet" href={prepared.url} download={prepared.file.name}>Download PNG</a>
        <a className="button quiet" href={prepared.url} target="_blank" rel="noopener noreferrer">Open PNG</a>
      </div>
      <p className="save-help">On iPhone, use Share or save image when available. Otherwise open the PNG, then use Safari’s Share menu or touch and hold the image to save it.</p>
    </>}
    {error && <p role="status">{error}</p>}
  </div>;
}
