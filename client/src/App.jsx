import React, { useState, useEffect, useCallback } from 'react';
import Split from 'react-split';
import CodeMirror from '@uiw/react-codemirror';
import { oneDark } from '@codemirror/theme-one-dark';
import { python } from '@codemirror/lang-python';
import axios from 'axios';
import { Pencil, Play } from 'lucide-react';
import './App.css';

const DEFAULT_CODE = `def main():
    print("Hello from IDE")
    return {"status": "ok"}
`;

export default function App() {
  const [code, setCode] = useState(DEFAULT_CODE);
  const [output, setOutput] = useState(null);
  const [loading, setLoading] = useState(false);
  const defaultApiUrl = import.meta.env.VITE_API_URL || "http://127.0.0.1:8080";
  const [url, setUrl] = useState(defaultApiUrl);
  const [editingUrl, setEditingUrl] = useState(false);

  const handleRun = useCallback(async () => {
    setLoading(true);
    setOutput(null);
    try {
      const res = await axios.post(`${url}/execute`, { script: code });
      setOutput(res.data);
    } catch (err) {
      setOutput(err.response?.data || { error: 'Unknown error' });
    }
    setLoading(false);
  }, [code, url]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleRun();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleRun]);

  return (
    <div className="app-container">
      <div className="top-bar">
        <div className="title">Python IDE</div>

        <div className="url-area" onClick={() => setEditingUrl(true)}>
          {editingUrl ? (
            <input
              autoFocus
              className="url-input"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && setEditingUrl(false)}
              onBlur={() => setEditingUrl(false)}
            />
          ) : (
            <div className="url-display">
              {url}
              <Pencil size={14} className="pencil-icon" />
            </div>
          )}
        </div>


        <button className="run-button" onClick={handleRun}>
          <Play size={16} className="play-icon" /> Run <span className="shortcut-hint">Ctrl+⏎</span>
        </button>


      </div>

      <Split
        className="split-horizontal"
        direction="horizontal"
        sizes={[60, 40]}
        minSize={200}
        gutterSize={6}
      >

        <div className="editor-pane">
          <CodeMirror
            value={code}
            height="100%"
            theme={oneDark}
            extensions={[python()]}
            onChange={setCode}
          />
        </div>

        <div className="output-pane">
          <h3>Output</h3>
          {loading && <div className="output-loading">Running script...</div>}
          {!loading && output && (
            <>
              {"result" in output && (
                <div className="output-section">
                  <strong>Result:</strong>
                  <pre>{JSON.stringify(output.result, null, 2)}</pre>
                </div>
              )}
              {"stdout" in output && (
                <div className="output-section">
                  <strong>Stdout:</strong>
                  <pre>{output.stdout}</pre>
                </div>
              )}
              {"error" in output && (
                <div className="output-error">
                  <strong>Error:</strong> {output.error}
                  {output.details && (
                    <div className="error-details">
                      <strong>Details:</strong> {output.details}
                    </div>
                  )}
                  {output.trace && (
                    <div className="error-trace">
                      <strong>Traceback:</strong>
                      <pre>{output.trace}</pre>
                    </div>
                  )}
                </div>
              )}

            </>
          )}
        </div>
      </Split>
    </div>
  );
}
