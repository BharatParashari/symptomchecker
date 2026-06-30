import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { api, getSocketUrl } from '../services/api';

export default function ChatRoom() {
  const { appointmentId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    api.getChat(appointmentId).then((data) => setMessages(data.messages || [])).catch(() => {});

    const token = localStorage.getItem('token');
    const socket = io(getSocketUrl(), { auth: { token } });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('join_appointment', { appointmentId });
    });
    socket.on('new_message', (msg) => {
      setMessages((prev) => [...prev, msg]);
    });
    socket.on('error', (err) => console.error(err));

    return () => socket.disconnect();
  }, [appointmentId, user, navigate]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = (e) => {
    e.preventDefault();
    if (!input.trim() || !socketRef.current) return;
    socketRef.current.emit('send_message', { appointmentId, content: input.trim() });
    setInput('');
  };

  return (
    <div className="mx-auto flex max-w-2xl flex-col px-4 py-6" style={{ height: 'calc(100vh - 140px)' }}>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-bold">Consultation Chat</h1>
        <span className={`text-xs ${connected ? 'text-green-600' : 'text-slate-400'}`}>
          {connected ? '● Live' : 'Connecting…'}
        </span>
      </div>

      <div className="card flex-1 overflow-y-auto space-y-3 mb-4">
        {messages.length === 0 && (
          <p className="text-center text-sm text-slate-400 py-8">No messages yet. Say hello to your doctor.</p>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === user?.id;
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                  mine ? 'bg-medical-600 text-white' : 'bg-slate-100 text-slate-800'
                }`}
              >
                {!mine && (
                  <p className="text-xs font-medium opacity-70 mb-0.5">
                    {m.first_name} {m.last_name}
                  </p>
                )}
                {m.content}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={send} className="flex gap-2">
        <input
          className="input flex-1"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message…"
        />
        <button type="submit" className="btn-primary" disabled={!connected}>
          Send
        </button>
      </form>

      <p className="mt-3 text-center text-xs text-slate-400">
        Video consultation: integrate Daily.co or Twilio Video in production.
      </p>
    </div>
  );
}
