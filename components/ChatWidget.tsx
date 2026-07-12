'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Sparkles, Leaf, Loader2 } from 'lucide-react';

interface ChatMessage {
  sender: 'user' | 'ai';
  text: string;
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { sender: 'ai', text: "Hello! I am EcoSphere AI, your ESG assistant. Ask me anything about our company's carbon footprint, sustainability policies, or how to improve our ESG scores." },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || loading) return;

    const userText = inputValue;
    setInputValue('');
    setMessages((prev) => [...prev, { sender: 'user', text: userText }]);
    setLoading(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch AI response');
      }

      const data = await response.json();
      setMessages((prev) => [...prev, { sender: 'ai', text: data.response }]);
    } catch (error) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        { sender: 'ai', text: 'AI service temporarily unavailable. Please try again later.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      {/* 1. Toggle Button - Enlarged & Glowing */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-14 h-14 rounded-full bg-slate-900 border-2 border-emerald-500 hover:border-emerald-450 hover:bg-slate-850 shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:shadow-[0_0_22px_rgba(16,185,129,0.35)] text-emerald-400 focus:outline-none transition-all"
      >
        {isOpen ? <X className="w-5 h-5" /> : <MessageSquare className="w-6 h-6 animate-pulse" />}
      </motion.button>

      {/* 2. Chat Panel - Widened & Sleeker */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 25, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 25, scale: 0.96 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="absolute bottom-16 right-0 w-80 sm:w-[400px] h-[520px] rounded-2xl border border-slate-800 bg-[#0d1017] shadow-[0_12px_45px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-[#131722] border-b border-slate-850">
              <div className="flex items-center gap-2.5">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <Leaf className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white tracking-wide uppercase">
                    EcoSphere AI
                  </h3>
                  <p className="text-[9px] text-slate-500 font-semibold uppercase">ESG Copilot Assistant</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-500 hover:text-white p-1 rounded-md transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Message Area */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-[#0d1017]">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed whitespace-pre-line ${
                      msg.sender === 'user'
                        ? 'bg-slate-900 border border-slate-800 text-white rounded-tr-none'
                        : 'bg-[#181d28] border border-slate-800/80 text-slate-200 rounded-tl-none'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="bg-[#181d28] border border-slate-800/80 text-slate-400 rounded-2xl rounded-tl-none px-4 py-2.5 text-xs flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                    Analyzing ESG context...
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input Form */}
            <form onSubmit={handleSend} className="p-3 border-t border-slate-850 bg-[#0d1017] flex gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask about carbon reduction suggestions..."
                className="flex-1 px-3 py-2.5 text-xs rounded-xl border border-slate-800 bg-[#141923] text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/20 transition-all"
              />
              <button
                type="submit"
                disabled={loading || !inputValue.trim()}
                className="p-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-850 text-white transition-all shadow-md shadow-emerald-500/10 focus:outline-none flex items-center justify-center shrink-0 w-9 h-9"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
