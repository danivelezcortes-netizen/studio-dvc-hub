import { bandLabel, bandPlain, type Band as BandName } from '../config/thresholds';

export function Band({ band }: { band: BandName }) {
  return (
    <span className={`band band-${band}`} title={bandPlain[band]}>
      {bandLabel[band]}
    </span>
  );
}
