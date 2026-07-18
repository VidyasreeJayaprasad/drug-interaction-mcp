'use client';

import React from 'react';
import { useWidgetSDK } from '@nitrostack/widgets';

interface DrugMechanism {
  type: string;
  strength: 'strong' | 'moderate' | 'weak';
  affected_drugs: string[];
}

interface DrugInfo {
  drug_name: string;
  generic_name?: string;
  brand_names: string[];
  drug_class: string;
  mechanisms: DrugMechanism[];
  primary_use: string;
  contraindications: string[];
  source: string;
  retrieved_at: string;
}

export default function DrugInfoWidget() {
  const { isReady, getToolOutput } = useWidgetSDK();
  const data = getToolOutput<DrugInfo>();

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
          <h3>Awaiting Drug Information</h3>
          <p style={{ color: 'var(--text-muted)' }}>Run the get_drug_info tool to load pharmacological profile details.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="widget-container">
      <div className="glass-card">
        {/* Header Block */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
          <div>
            <h1 style={{ margin: '0 0 6px 0', textTransform: 'capitalize', fontSize: '1.6rem' }}>
              {data.drug_name}
            </h1>
            {data.generic_name && (
              <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                Generic: <strong style={{ color: '#fff' }}>{data.generic_name}</strong>
              </span>
            )}
          </div>
          <span className="badge moderate" style={{ fontSize: '12px', padding: '6px 12px' }}>
            {data.drug_class}
          </span>
        </div>

        {/* Brand Names Section */}
        {data.brand_names && data.brand_names.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', marginBottom: '6px', fontWeight: 600 }}>
              Common Brand Names
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {data.brand_names.map((brand, i) => (
                <span key={i} className="med-pill" style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.06)', fontSize: '0.85rem' }}>
                  {brand}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Enzyme Pathways / Mechanisms */}
        <div style={{ marginBottom: '24px' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', marginBottom: '12px', fontWeight: 600 }}>
            CYP Enzyme & Metabolic Pathways
          </span>
          
          {data.mechanisms.length === 0 ? (
            <div style={{ padding: '16px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '8px', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              No significant CYP enzyme metabolic pathways or interactions flagged on FDA label.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '12px' }}>
              {data.mechanisms.map((mech, index) => {
                const isStrong = mech.strength === 'strong';
                const isMod = mech.strength === 'moderate';
                const badgeColorClass = isStrong ? 'high' : isMod ? 'moderate' : 'low';
                
                return (
                  <div key={index} style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '16px',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <strong style={{ fontSize: '1rem', color: '#fff' }}>{mech.type}</strong>
                      <span className={`badge ${badgeColorClass}`} style={{ fontSize: '10px' }}>
                        {mech.strength}
                      </span>
                    </div>
                    {mech.affected_drugs && mech.affected_drugs.length > 0 && (
                      <div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                          Common substrate drugs affected:
                        </span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {mech.affected_drugs.map((drug, dIdx) => (
                            <span key={dIdx} className="med-pill" style={{ fontSize: '0.75rem', padding: '2px 8px', background: 'rgba(239, 68, 68, 0.05)', borderColor: 'rgba(239, 68, 68, 0.1)', color: '#fca5a5' }}>
                              {drug}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Contraindications / Boxed Warnings */}
        {data.contraindications && data.contraindications.length > 0 && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.03)',
            border: '1px solid rgba(239, 68, 68, 0.15)',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '20px'
          }}>
            <strong style={{ color: '#ef4444', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
              <span>⚠️</span> Contraindications & Warnings
            </strong>
            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.875rem', color: 'rgba(248, 250, 252, 0.9)', lineHeight: '1.5' }}>
              {data.contraindications.map((contra, i) => (
                <li key={i} style={{ marginBottom: '4px' }}>{contra}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Source info */}
        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: '12px', marginTop: '20px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          <span>Source: {data.source}</span>
          <span>Retrieved at {new Date(data.retrieved_at).toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
