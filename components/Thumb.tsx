export function Thumb({
  id,
  alt,
  hasThumbnail,
  tall = false,
}: {
  id: string;
  alt: string;
  hasThumbnail: boolean;
  tall?: boolean;
}) {
  if (!hasThumbnail) {
    return <div className={tall ? 'thumb thumb-tall thumb-empty' : 'thumb thumb-empty'} aria-hidden="true" />;
  }
  return <img className={tall ? 'thumb thumb-tall' : 'thumb'} src={`/api/thumb/${id}`} alt={alt} />;
}
