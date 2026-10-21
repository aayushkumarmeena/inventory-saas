import React, { useState, useEffect, useRef } from 'react';
import { queryStoreAssistant, runStockWiseEngine } from '../utils/aiEngine';
import { productApi } from '../api/productApi';
import { batchApi } from '../api/batchApi';
import { salesApi } from '../api/salesApi';
import { supplierApi } from '../api/supplierApi';

function renderInline(str) {
  const parts = [];
  const regex = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let lastIdx = 0;
  let match;

  while ((match = regex.exec(str)) !== null) {
    if (match.index > lastIdx) {
      parts.push(str.substring(lastIdx, match.index));
    }
    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      parts.push(
        <strong key={match.index} style={{ color: '#fff', fontWeight: 600 }}>
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('`') && token.endsWith('`')) {
      parts.push(
        <code
          key={match.index}
          style={{
            background: 'rgba(255, 255, 255, 0.14)',
            padding: '2px 5px',
            borderRadius: 4,
            fontSize: 12,
            fontFamily: 'monospace',
            color: '#c7d2fe',
          }}
        >
          {token.slice(1, -1)}
        </code>
      );
    }
    lastIdx = regex.lastIndex;
  }

  if (lastIdx < str.length) {
    parts.push(str.substring(lastIdx));
  }

  return parts;
}

function FormattedMessage({ text }) {
  const lines = (text || '').split('\n');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={idx} style={{ height: 4 }} />;
        }

        if (trimmed.startsWith('•') || trimmed.startsWith('-')) {
          const content = trimmed.substring(1).trim();
          return (
            <div key={idx} style={{ display: 'flex', gap: 8, paddingLeft: 4 }}>
              <span style={{ color: '#818cf8', flexShrink: 0, marginTop: 1 }}>•</span>
              <div>{renderInline(content)}</div>
            </div>
          );
        }

        return <div key={idx}>{renderInline(line)}</div>;
      })}
    </div>
  );
}

const DEFAULT_WELCOME = {
  sender: 'assistant',
  text: '👋 **Hello Store Manager!** I am your **StockWise AI Copilot**.\n\nI continuously monitor stock velocity, shelf life, FEFO rotation, and margin guardrails across your catalog.\n\nHow can I help you today?',
};

export default function AIAssistantDrawer({ engineData: propEngineData, isOpen, onClose, onOpen }) {
  const [messages, setMessages] = useState([DEFAULT_WELCOME]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [internalEngineData, setInternalEngineData] = useState(null);
  const [copiedIdx, setCopiedIdx] = useState(null);
  const endRef = useRef(null);

  // Global event listener so any page/component can open the Copilot
  useEffect(() => {
    const handleOpenEvent = () => onOpen?.();
    window.addEventListener('open-ai-copilot', handleOpenEvent);
    return () => window.removeEventListener('open-ai-copilot', handleOpenEvent);
  }, [onOpen]);

  // Self-load if engineData is not passed
  useEffect(() => {
    if (isOpen && !propEngineData && !internalEngineData) {
      Promise.allSettled([
        productApi.list({ page: 0, size: 100 }),
        batchApi.list({ page: 0, size: 100 }),
        salesApi.list({ page: 0, size: 50 }),
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
    }, 350);
  };

  const handleCopy = (text, idx) => {
    navigator.clipboard?.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const handleClear = () => {
    setMessages([DEFAULT_WELCOME]);
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
          aria-label="Open AI Copilot"
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 999,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 20px',
            background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
            color: '#fff',
            borderRadius: 30,
            border: 'none',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: 14,
          }}
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
            background: 'rgba(0, 0, 0, 0.55)',
            backdropFilter: 'blur(5px)',
            WebkitBackdropFilter: 'blur(5px)',
            zIndex: 1000,
            display: 'flex',
            justifyContent: 'flex-end',
            animation: 'fadeIn 0.2s ease',
          }}
          onClick={onClose}
        >
          {/* Drawer Body */}
          <div
            style={{
              width: '100%',
              maxWidth: 450,
              height: '100%',
              background: 'var(--card-bg, #0f172a)',
              color: 'var(--text-primary, #f8fafc)',
              boxShadow: '-8px 0 36px rgba(0, 0, 0, 0.6)',
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
                background: 'linear-gradient(135deg, rgba(99,102,241,0.18), rgba(168,85,247,0.1))',
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
                    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)',
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
                    Continuous Store Intelligence & Guardrails
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button
                  onClick={handleClear}
                  title="Clear conversation"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted, #94a3b8)',
                    fontSize: 16,
                    cursor: 'pointer',
                    padding: '6px 8px',
                    borderRadius: 6,
                    transition: 'color 0.15s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted, #94a3b8)')}
                >
                  <i className="ti ti-trash" />
                </button>
                <button
                  onClick={onClose}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted, #94a3b8)',
                    fontSize: 20,
                    cursor: 'pointer',
                    padding: 4,
                    borderRadius: 6,
                  }}
                >
                  <i className="ti ti-x" />
                </button>
              </div>
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
                    maxWidth: '90%',
                    position: 'relative',
                    padding: '12px 16px',
                    borderRadius: 14,
                    fontSize: 13,
                    lineHeight: 1.55,
                    background:
                      m.sender === 'user'
                        ? '#6366f1'
                        : 'rgba(255, 255, 255, 0.05)',
                    color: '#fff',
                    border:
                      m.sender === 'user'
                        ? 'none'
                        : '1px solid rgba(255, 255, 255, 0.08)',
                    boxShadow:
                      m.sender === 'user'
                        ? '0 4px 14px rgba(99, 102, 241, 0.3)'
                        : 'none',
                  }}
                >
                  {m.sender === 'user' ? (
                    <div>{m.text}</div>
                  ) : (
                    <>
                      <FormattedMessage text={m.text} />
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'flex-end',
                          marginTop: 6,
                          paddingTop: 6,
                          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                        }}
                      >
                        <button
                          onClick={() => handleCopy(m.text, i)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: copiedIdx === i ? '#10b981' : '#94a3b8',
                            fontSize: 11,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '2px 4px',
                          }}
                        >
                          <i className={`ti ${copiedIdx === i ? 'ti-check' : 'ti-copy'}`} />
                          <span>{copiedIdx === i ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                    </>
                  )}
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
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <span className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} />
                  <span>Analyzing store telemetry...</span>
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
                    transition: 'all 0.15s ease',
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
                  boxShadow: '0 4px 12px rgba(99, 102, 241, 0.35)',
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
