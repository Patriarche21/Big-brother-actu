
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';

const App = () => {
  const [url, setUrl] = useState('');
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchTodos = async () => {
    const res = await fetch('http://localhost:3001/todos');
    const data = await res.json();
    setTodos(data);
  };

  useEffect(() => {
    fetchTodos();
  }, []);

  const handleSubmit = async () => {
    if (!url) return;
    setLoading(true);
    await fetch('http://localhost:3001/rewrite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    setUrl('');
    await fetchTodos();
    setLoading(false);
  };

  return (
    <div style={{ padding: 20, fontFamily: 'Arial' }}>
      <h1>DeepSeek Article Rewriter</h1>
      <input
        style={{ width: '70%', padding: 10 }}
        type="text"
        placeholder="Enter article URL..."
        value={url}
        onChange={(e) => setUrl(e.target.value)}
      />
      <button onClick={handleSubmit} style={{ padding: 10, marginLeft: 10 }}>
        Rewrite
      </button>

      {loading && <p>Processing...</p>}

    <ul>
  {todos.map((item, idx) => (
    <li key={idx} style={{ marginBottom: '2em' }}>
      <div style={{ fontWeight: 'bold', fontSize: '1.3em', marginBottom: '10px' }}>
        {item.title}
      </div>
      <div style={{ whiteSpace: 'pre-line', lineHeight: 1.6 }}>
        {item.content}
      </div>
    </li>
  ))}
</ul>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
