import React, { useState, useEffect, useCallback } from 'react';
import Split from 'react-split';
import CodeMirror from '@uiw/react-codemirror';
import { oneDark } from '@codemirror/theme-one-dark';
import { python } from '@codemirror/lang-python';
import axios from 'axios';
import { Pencil, Play } from 'lucide-react';
import './App.css';

const INITIAL_CODE = `def main():
    message = "Python execution successful!"
    print(message)
    return {"message": message}
`;

export default function App() {
  const [script, setScript] = useState(INITIAL_CODE);
  const [response, setResponse] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const apiEndpoint = import.meta.env.VITE_API_URL || "http://127.0.0.1:8080";
  const [endpoint, setEndpoint] = useState(apiEndpoint);
  const [isEditing, setIsEditing] = useState(false);

  const runScript = useCallback(async () => {
    setIsRunning(true);
    setResponse(null);
    try {
      const result = await axios.post(`${endpoint}/execute`, { script });
      setResponse(result.data);
    } catch (err) {
      setResponse(err.response?.data || { error: 'Unknown error occurred' });
    }
    setIsRunning(false);
  }, [script, endpoint]);

  useEffect(() => {
    const triggerRun = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        runScript();
      }
    };
    window.addEventListener('keydown', triggerRun);
    return () => window.removeEventListener('keydown', triggerRun);
  }, [runScript]);

  return (
    <div className="app-container">
      <header className="top-bar">
        <h1 className="title">Python IDE</h1>

        <div className="url-area" onClick={() => setIsEditing(true)}>
          {isEditing ? (
            <input
              autoFocus
              className="url-input"
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && setIsEditing(false)}
              onBlur={() => setIsEditing(false)}
            />
          ) : (
            <div className="url-display">
              {endpoint}
              <Pencil size={14} className="pencil-icon" />
            </div>
          )}
        </div>

        <button className="run-button" onClick={runScript}>
          <Play size={16} className="play-icon" /> Run
          <span className="shortcut-hint">Ctrl+⏎</span>
        </button>
      </header>

      <Split
        className="split-horizontal"
        direction="horizontal"
        sizes={[60, 40]}
        minSize={200}
        gutterSize={6}
      >
        <section className="editor-pane">
          <CodeMirror
            value={script}
            height="100%"
            theme={oneDark}
            extensions={[python()]}
            onChange={setScript}
          />
        </section>

        <section className="output-pane">
          <h3>Output</h3>
          {isRunning && <div className="output-loading">Running script...</div>}

          {!isRunning && response && (
            <>
              {'result' in response && (
                <div className="output-section">
                  <strong>Result:</strong>
                  <pre>{JSON.stringify(response.result, null, 2)}</pre>
                </div>
              )}
              {'stdout' in response && (
                <div className="output-section">
                  <strong>Stdout:</strong>
                  <pre>{response.stdout}</pre>
                </div>
              )}
              {'error' in response && (
                <div className="output-error">
                  <strong>Error:</strong> {response.error}
                  {response.details && (
                    <div className="error-details">
                      <strong>Details:</strong> {response.details}
                    </div>
                  )}
                  {response.trace && (
                    <div className="error-trace">
                      <strong>Traceback:</strong>
                      <pre>{response.trace}</pre>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </section>
      </Split>
    </div>
  );
}
