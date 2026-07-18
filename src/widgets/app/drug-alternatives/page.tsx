'use client';

import React from 'react';
import { useWidgetSDK } from '@nitrostack/widgets';

interface DrugAlternative {
  drug_name: string;
  generic_name?: string;
  brand_names: string[];
  drug_class: string;
  why_safer: string;
  key_side_effects: string[];
  contraindications: string[];
  notes: string;
}

interface DrugAlternativesOutput {
  drug_to_replace: string;
  condition: string;
  alternatives: DrugAlternative[];
  safety_note: string;
  retrieved_at: string;
}

export default function DrugAlternativesWidget() {
  const { isReady, getToolOutput } = useWidgetSDK();
  const data = getToolOutput<DrugAlternativesOutput>();

  if (!isReady) {
    return (
      <div className="widget-container">
        <div className="glass-card" style={{ textAlign: 'center', padding: '40px' }}>
          <h3>Connecting to MCP Server...</h3>
          <p style={{ color: 'var(--text-muted)' }}>Establishing secure connection to NitroStack</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="widget-container">
        <div className="glass-card" style={{ textAlign: 'center', padding: '40px' }}>
          <h3>Awaiting Alternatives Analysis</h3>
          <p style={{ color: 'var(--text-muted)' }}>Run the get_drug_alternatives tool to find safer options.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="widget-container">
      <div className="glass-card">
        {/* Header Section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
          <div>
            <h1 style={{ marginBottom: '8px', fontSize: '1.5rem' }}>Safer Alternatives</h1>
            <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.95rem' }}>
              Replacing <span style={{ color: '#fca5a5', fontWeight: 'bold' }}>{data.drug_to_replace}</span> for <span style={{ color: '#93c5fd', fontWeight: 'bold' }}>{data.condition}</span>
            </p>
          </div>
          <span className="badge low" style={{ fontSize: '12px', padding: '6px 12px' }}>
            Evidence Checked
          </span>
        </div>

        {/* Alternatives Cards List */}
        <div style={{ display: 'grid', gap: '20px', marginBottom: '24px' }}>
          {data.alternatives.map((alt, index) => {
            const isConsultation = alt.drug_name.toLowerCase().includes('consult');
            
            return (
              <div 
                key={index} 
                className="alternative-card"
                style={{ 
                  background: 'rgba(255, 255, 255, 0.02)', 
                  border: isConsultation ? '1px dashed var(--border)' : '1px solid rgba(16, 185, 129, 0.2)',
                  borderRadius: '12px',
                  padding: '20px',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <h3 style={{ margin: 0, textTransform: 'capitalize', color: isConsultation ? 'var(--text-muted)' : '#6ee7b7', fontSize: '1.25rem' }}>
                      {alt.drug_name} {alt.brand_names.length > 0 && `(${alt.brand_names.join(', ')})`}
                    </h3>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{alt.drug_class}</span>
                  </div>
                  {!isConsultation && (
                    <span className="badge low" style={{ textTransform: 'none', background: 'rgba(16, 185, 129, 0.1)', color: '#34d399' }}>
                      Safer Profile
                    </span>
                  )}
                </div>

                {/* Safety justification */}
                <div style={{ background: 'rgba(16, 185, 129, 0.05)', borderLeft: '3px solid var(--success)', padding: '12px 16px', borderRadius: '4px', marginBottom: '16px' }}>
                  <strong style={{ color: '#34d399', fontSize: '0.9rem', display: 'block', marginBottom: '4px' }}>Why it is safer:</strong>
                  <span style={{ fontSize: '0.92rem', color: 'var(--text-main)' }}>{alt.why_safer}</span>
                </div>

                {/* Side effects & contraindications grid */}
                {!isConsultation && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '0.875rem' }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '6px', fontWeight: 600 }}>Key Side Effects</span>
                      <ul style={{ margin: 0, paddingLeft: '16px', color: 'var(--text-main)' }}>
                        {alt.key_side_effects.map((se, i) => (
                          <li key={i} style={{ marginBottom: '4px' }}>{se}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '6px', fontWeight: 600 }}>Contraindications</span>
                      <ul style={{ margin: 0, paddingLeft: '16px', color: '#fca5a5' }}>
                        {alt.contraindications.map((ci, i) => (
                          <li key={i} style={{ marginBottom: '4px' }}>{ci}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Extra Notes */}
                {alt.notes && (
                  <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.05)', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                    <strong>Note:</strong> {alt.notes}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Safety Disclaimer Callout */}
        <div style={{ 
          background: 'rgba(245, 158, 11, 0.05)', 
          border: '1px solid rgba(245, 158, 11, 0.2)', 
          padding: '16px', 
          borderRadius: '12px', 
          fontSize: '0.875rem',
          color: '#fde047',
          display: 'flex',
          gap: '12px',
          alignItems: 'flex-start'
        }}>
          <span style={{ fontSize: '1.2rem', marginTop: '-2px' }}>⚠️</span>
          <div>
            <strong>Safety Guidance Note:</strong>
            <p style={{ margin: '4px 0 0 0', color: 'rgba(255,255,255,0.8)', lineHeight: '1.4' }}>
              {data.safety_note}
            </p>
          </div>
        </div>

        <div style={{ marginTop: '16px', textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Retrieved at {new Date(data.retrieved_at).toLocaleString()}
        </div>
      </div>
    </div>
  );
}
