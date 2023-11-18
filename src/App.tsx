import { useEffect, useRef, useState } from 'react'
import 'xterm/css/xterm.css';
import { Terminal } from 'xterm';


function App() {
  const terminalRef = useRef<HTMLDivElement>(null);
  const [terminal] = useState(new Terminal());

  useEffect(() => {
    if (terminalRef.current) {
      terminal.open(terminalRef.current);
      terminal.write('Hello from \x1B[1;3;31mxterm.js\x1B[0m $ ');
    }
  }, [terminal]);

  return (
    <>
      <div ref={terminalRef}></div>
    </>
  )
}

export default App
