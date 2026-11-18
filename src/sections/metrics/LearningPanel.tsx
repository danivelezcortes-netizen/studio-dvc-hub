import { Missing } from '../../components/Missing';
import type { Week } from '../../types';

export function LearningPanel({ weeks }: { weeks: Week[] }) {
  return (
    <section className="block">
      <div className="block-head">
        <h3>What we're learning</h3>
        <p className="quiet">
          Notes from each week, copied as they were written. The scores in the table are calculated from each post's numbers.
        </p>
      </div>
      {weeks.length === 0 ? (
        <p className="empty-filter">No weekly notes yet.</p>
      ) : (
        <ol className="week-list">
          {weeks.map((week, index) => (
            <li key={week.weekStart} className={index === 0 ? 'week-note latest' : 'week-note'}>
              <p className="kicker">{index === 0 ? 'Latest week' : 'Earlier week'}</p>
              <h4>{week.week}</h4>
              <div className="learn-grid">
                <div>
                  <h5>What we tried</h5>
                  {week.testing ? <p>{week.testing}</p> : <Missing />}
                </div>
                <div>
                  <h5>What to do next</h5>
                  {week.recommendations ? <p>{week.recommendations}</p> : <Missing />}
                </div>
              </div>
              <p className="standout">
                <span>Standout</span>
                {week.bestPost ? week.bestPost : <Missing />}
              </p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
