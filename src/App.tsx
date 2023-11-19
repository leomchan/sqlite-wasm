import { useEffect, useState } from 'react'
import 'xterm/css/xterm.css';
import { ReplaySubject } from 'rxjs';
import { CircularProgress, Button } from '@mui/material';
import { Range, List } from 'immutable';
import _ from 'lodash';
import { DateTime, Interval, Duration } from 'luxon';

type PromiserResult = {
  type: string;
  result: unknown;
};

type WorkerEvent = {
  data: PromiserResult;
};

type PromiserConfig = {
  onready?: () => void;
  worker?: Worker | (() => Worker);
  generateMessageId?: () => string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  debug?: (...data: any[]) => void;
  onunhandled?: (event: WorkerEvent) => void;
};

type SQLite3RowType = {
  type: string,
  row: unknown,
  rowNumber: number,
  columnNames: string[],
};

type PromiserFunction = (messageType: string, messageArgs: unknown[] | unknown) => Promise<PromiserResult>;
type PromiserFactory = (config: PromiserConfig) => PromiserFunction;

const sqlite3$ = new ReplaySubject<string>(1);

const promiserFactory = (window as unknown as { sqlite3Worker1Promiser: PromiserFactory }).sqlite3Worker1Promiser;
const promiser = promiserFactory({
  onready: () => {
    sqlite3$.next('ready');
  },
  worker: new Worker('sqlite3/sqlite3-worker1.js'),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  debug: (...data: any[]) => {
    console.log(...data);
  },
  onunhandled: (event) => {
    console.error(event);
    sqlite3$.error(new Error('Unhandled event ' + JSON.stringify(event)));
  },
});

addEventListener('unload', () => {
  console.log('closing…');
  promiser('close', []).then(() => {
    sqlite3$.next('closed');
  })
});

const GENERATE_SIZE = 100;

function App() {
  const [ready, setReady] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [widgetCount, setWidgetCount] = useState(-1);
  const [elapsed, setElapsed] = useState(Duration.invalid('not initialized', 'not initialized'));

  useEffect(() => {
    const sub = sqlite3$.subscribe({
      next: (msg) => {
        if (msg === 'ready') {
          promiser('open', { filename: 'file:test.sqlite3?vfs=opfs'})
            .then(() => promiser(
                'exec',
                'CREATE TABLE IF NOT EXISTS widgets (id INTEGER PRIMARY KEY, name TEXT, price REAL)'
              )
            )
            // .then(() => promiser(
            //   'exec',
            //   'DELETE FROM widgets' // sqlite3 does not have a TRUNCATE statement
            // ))
            .then(() => {
              setReady(true);
            })
        }
      },
    });

    return () => {
      sub.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!ready) {
      setWidgetCount(-1);
      return;
    }
    promiser('exec', {
      sql: 'SELECT COUNT(*) AS count FROM widgets',
      callback: (row: SQLite3RowType) => {
        if (row.rowNumber) {
          setWidgetCount(_.get(row.row, ['0'], -1) as number);
        }
      },
    });
  }, [generating, ready]);

  const generateWidgets = () => {
    setGenerating(true);
    const start = DateTime.utc();
    Range(0, GENERATE_SIZE).reduce(async (p, i) => {
      await p;
      return promiser(
        'exec',
        {
          sql: 'INSERT INTO widgets (name, price) VALUES (?, ?)',
          bind: [`Widget ${i}`, Math.random() * 100],
        }
      );
    }, promiser('exec', 'BEGIN TRANSACTION'))
    .then(() => promiser('exec', 'COMMIT TRANSACTION'))
    .catch(() => promiser('exec', 'ROLLBACK TRANSACTION'))
    .finally(() => {
      setElapsed(Interval.fromDateTimes(start, DateTime.utc()).toDuration());
      setGenerating(false);
    });
  };

  const generateWidgetsMultiStatement = () => {
    setGenerating(true);
    const start = DateTime.utc();
    const sql = Range(0, GENERATE_SIZE).reduce((lines, i) => {
      return lines.push(`INSERT INTO widgets (name, price) VALUES ('Widget ${i}', ${Math.random() * 100});`);
    }, List<string>(['BEGIN TRANSACTION;'])).push('COMMIT TRANSACTION;').join('\n');
    promiser('exec', sql)
      .catch(() => promiser('exec', 'ROLLBACK TRANSACTION'))
      .finally(() => {
        setElapsed(Interval.fromDateTimes(start, DateTime.utc()).toDuration());
        setGenerating(false);
      });
  };

  if (!ready) {
    return (
      <CircularProgress />
    )
  }

  return (
    <>
      <p>Widgets: {widgetCount}</p>
      <div>
      <Button variant="contained" onClick={generateWidgets} disabled={generating}>Generate widgets</Button>
      </div>
      <div>
      <Button variant="contained" onClick={generateWidgetsMultiStatement} disabled={generating}>Generate widgets with multi statement sql</Button>
      </div>
      <p>Elapsed: {elapsed.toISO()}</p>
    </>
  )
}

export default App
