import React, { useState, useEffect, useRef } from 'react';
import { queryStoreAssistant, runStockWiseEngine } from '../utils/aiEngine';
import { productApi } from '../api/productApi';
import { batchApi } from '../api/batchApi';
import { saleApi } from '../api/saleApi';
import { supplierApi } from '../api/supplierApi';

export default function AIAssistantDrawer({ engineData: propEngineData, isOpen, onClose, onOpen }) {
  const [messages, setMessages] = useState([
    {
      sender: 'assistant',
      text: '👋 **Hello Store Manager!** I am your **StockWise AI Copilot**.\n\nI continuously monitor stock velocity, shelf life, FEFO rotation, and margin guardrails across your catalog.\n\nHow can I help you today?',
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [internalEngineData, setInternalEngineData] = useState(null);
  const endRef = useRef(null);

  // Self-load if engineData is not passed
  useEffect(() => {
    if (isOpen && !propEngineData && !internalEngineData) {
      Promise.allSettled([
        productApi.list({ page: 0, size: 100 }),
        batchApi.list({ page: 0, size: 100 }),
        saleApi.list({ page: 0, size: 50 }),
        supplierApi.list({ page: 0, size: 50 }),
      ]).then(([pRes, bRes, sRes, supRes]) => {
        const prods = pRes.status === 'fulfilled' ? pRes.value.data?.data?.content || [] : [];
        const batches = bRes.status === 'fulfilled' ? bRes.value.data?.data?.content || [] : [];
        const sales = sRes.status === 'fulfilled' ? sRes.value.data?.data?.content || [] : [];
        const sups = supRes.status === 'fulfilled' ? supRes.value.data?.data?.content || [] : [];
        setInternalEngineData(runStockWiseEngine(prods, batches, sales, sups));
      });
    }
  }, [isOpen, propEngineData, internalEngineData]);

  const activeEngineData = propEngineData || internalEngineData || {
    inventoryMetrics: [],
    expiryMetrics: [],
    recommendations: [],
    stats: {},
  };

  useEffect(() => {
    if (isOpen) {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = (textToSend) => {
    const q = textToSend || input;
    if (!q.trim()) return;

    const userMsg = { sender: 'user', text: q };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    setTimeout(() => {
      const response = queryStoreAssistant(q, activeEngineData);
      setMessages((prev) => [...prev, { sender: 'assistant', text: response.answer, type: response.type }]);
      setIsTyping(false);
    }, 400);
  };

  const PROMPTS = [
    { label: '📦 What needs restocking?', query: 'What products need restocking right now?' },
    { label: '⏳ Expiring batches & waste', query: 'Show me batches expiring soon and waste exposure' },
    { label: '🏷️ Clearance markdowns', query: 'What discounts and clearance markdowns are recommended?' },
    { label: '🛡️ Margin guardrails audit', query: 'Explain how critic guardrails protect my profit margins' },
    { label: '📊 Store health summary', query: 'Give me an overall inventory health summary' },
  ];

  return (
    <>
      {/* Floating launcher trigger */}
      {!isOpen && (
        <button
          onClick={onOpen}
          className="ai-floating-trigger"
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 999,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 18px',
            background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
            color: '#fff',
            borderRadius: 30,
            border: 'none',
            boxShadow: '0 8px 24px rgba(99, 102, 241, 0.45)',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: 14,
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          <i className="ti ti-sparkles" style={{ fontSize: 18 }} />
          <span>AI Copilot</span>
        </button>
      )}

      {/* Drawer Overlay */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
            zIndex: 1000,
            display: 'flex',
            justifyContent: 'flex-end',
          }}
          onClick={onClose}
        >
          {/* Drawer Body */}
          <div
            style={{
              width: '100%',
              maxWidth: 440,
              height: '100%',
              background: 'var(--card-bg, #0f172a)',
              color: 'var(--text-primary, #f8fafc)',
              boxShadow: '-8px 0 32px rgba(0, 0, 0, 0.5)',
              display: 'flex',
              flexDirection: 'column',
              borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(168,85,247,0.08))',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                  }}
                >
                  <i className="ti ti-sparkles" style={{ fontSize: 20 }} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15, display: 'flex', alignItems: 'center', gap: 6 }}>
                    StockWise AI Copilot
                    <span
                      style={{
                        fontSize: 10,
                        padding: '2px 6px',
                        borderRadius: 4,
                        background: '#10b981',
                        color: '#fff',
                        fontWeight: 700,
                      }}
                    >
                      LIVE
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted, #94a3b8)' }}>
                    Deterministic Store Intelligence
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted, #94a3b8)',
                  fontSize: 20,
                  cursor: 'pointer',
                  padding: 4,
                }}
              >
                <i className="ti ti-x" />
              </button>
            </div>

            {/* Messages Scroll Area */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '16px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
              }}
            >
              {messages.map((m, i) => (
                <div
                  key={i}
                  style={{
                    alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: '88%',
                    padding: '12px 16px',
                    borderRadius: 14,
                    fontSize: 13,
                    lineHeight: 1.5,
                    background:
                      m.sender === 'user'
                        ? '#6366f1'
                        : 'rgba(255, 255, 255, 0.05)',
                    color: '#fff',
                    border:
                      m.sender === 'user'
                        ? 'none'
                        : '1px solid rgba(255, 255, 255, 0.08)',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {m.text}
                </div>
              ))}
              {isTyping && (
                <div
                  style={{
                    alignSelf: 'flex-start',
                    padding: '8px 14px',
                    borderRadius: 12,
                    background: 'rgba(255, 255, 255, 0.05)',
                    fontSize: 12,
                    color: '#94a3b8',
                  }}
                >
                  <span className="spinner" style={{ width: 12, height: 12, display: 'inline-block', marginRight: 6 }} />
                  Analyzing store telemetry...
                </div>
              )}
              <div ref={endRef} />
            </div>

            {/* Quick Prompt Pills */}
            <div
              style={{
                padding: '8px 16px',
                display: 'flex',
                gap: 6,
                overflowX: 'auto',
                borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                whiteSpace: 'nowrap',
              }}
            >
              {PROMPTS.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(p.query)}
                  style={{
                    padding: '6px 12px',
                    background: 'rgba(99, 102, 241, 0.12)',
                    border: '1px solid rgba(99, 102, 241, 0.25)',
                    borderRadius: 16,
                    color: '#c7d2fe',
                    fontSize: 11,
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(99, 102, 241, 0.25)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(99, 102, 241, 0.12)')}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Input Bar */}
            <div
              style={{
                padding: '12px 16px',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                gap: 8,
              }}
            >
              <input
                type="text"
                placeholder="Ask about restocks, expiry, markdowns..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: 10,
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#fff',
                  fontSize: 13,
                  outline: 'none',
                }}
              />
              <button
                onClick={() => handleSend()}
                style={{
                  padding: '10px 16px',
                  borderRadius: 10,
                  background: '#6366f1',
                  color: '#fff',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                <i className="ti ti-send" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
