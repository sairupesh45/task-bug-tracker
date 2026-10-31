import { useEffect, useState } from "react";

const API = "http://127.0.0.1:8000/api";

export default function App() {
  const [tickets, setTickets] = useState([]);
  const [filter, setFilter] = useState("");
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("medium");

  const load = async () => {
    const url = filter ? `${API}/tickets?status=${filter}` : `${API}/tickets`;
    setTickets(await (await fetch(url)).json());
  };

  useEffect(() => { load(); }, [filter]);

  const addTicket = async () => {
    if (!title.trim()) return;
    await fetch(`${API}/tickets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, priority }),
    });
    setTitle("");
    load();
  };

  const setStatus = async (id, status) => {
    await fetch(`${API}/tickets/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  };

  const remove = async (id) => {
    await fetch(`${API}/tickets/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div style={{ maxWidth: 700, margin: "2rem auto", fontFamily: "sans-serif" }}>
      <h1>Task and Bug Tracker</h1>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input value={title} onChange={(e) => setTitle(e.target.value)}
               placeholder="New ticket title" style={{ flex: 1 }} />
        <select value={priority} onChange={(e) => setPriority(e.target.value)}>
          <option>low</option><option>medium</option><option>high</option>
        </select>
        <button onClick={addTicket}>Add</button>
      </div>

      <select value={filter} onChange={(e) => setFilter(e.target.value)}>
        <option value="">All</option>
        <option value="open">Open</option>
        <option value="in_progress">In progress</option>
        <option value="done">Done</option>
      </select>

      <ul style={{ listStyle: "none", padding: 0 }}>
        {tickets.map((t) => (
          <li key={t.id} style={{ border: "1px solid #ccc", borderRadius: 6,
                                  padding: 10, marginTop: 10 }}>
            <strong>{t.title}</strong> ({t.priority})
            <div style={{ marginTop: 6 }}>
              <select value={t.status} onChange={(e) => setStatus(t.id, e.target.value)}>
                <option value="open">open</option>
                <option value="in_progress">in_progress</option>
                <option value="done">done</option>
              </select>
              <button onClick={() => remove(t.id)} style={{ marginLeft: 8 }}>Delete</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}