import { useEffect, useRef, useState } from 'react'
import 'xterm/css/xterm.css';
import { Terminal } from 'xterm';
import { nanoid } from 'nanoid';
import { ReplaySubject } from 'rxjs';

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

type PromiserFunction = (messageType: string, messageArgs: unknown[]) => Promise<PromiserResult>;
type PromiserFactory = (config: PromiserConfig) => PromiserFunction;

const sqlite3$ = new ReplaySubject<string>(1);

const promiserFactory = (window as unknown as { sqlite3Worker1Promiser: PromiserFactory }).sqlite3Worker1Promiser;
const promiser = promiserFactory({
  onready: () => {
    sqlite3$.next('ready');
  },
  worker: new Worker('sqlite3/sqlite3-worker1.js'),
  generateMessageId: nanoid,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  debug: (...data: any[]) => {
    console.log(data);
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

function App() {
  const terminalRef = useRef<HTMLDivElement>(null);
  const [terminal] = useState(new Terminal({ convertEol: true }));

  useEffect(() => {
    if (terminalRef.current) {
      terminal.open(terminalRef.current);
      terminal.write('SQLite\n');
      const sub = sqlite3$.subscribe({
        next: (msg) => terminal.write(msg + '\n'),
        error: (err) => terminal.write('\x1B[1;3;31m' + err.message + '\x1B[0m\n'),
      });

      return () => {
        sub.unsubscribe();
      };
    }
  }, [terminal]);

  return (
    <>
      <div ref={terminalRef}></div>
    </>
  )
}

export default App
