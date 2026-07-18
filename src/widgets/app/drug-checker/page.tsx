'use client';

import React from 'react';
import { useWidgetSDK } from '@nitrostack/widgets';

export default function DrugCheckerWidget() {
  const { isReady, getToolOutput } = useWidgetSDK();
  const data = getToolOutput<any>();

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
          <h3>Awaiting Drug Analysis</h3>
          <p style={{ color: 'var(--text-muted)' }}>Run the check_drug_interactions tool to see live results here.</p>
        </div>
      </div>
    );
  }

  // Determine highest risk level from FDA warnings or AI instructions
  const isHighRisk = data.ai_instruction?.toLowerCase().includes('high risk') || 
                     (data.fda_adverse_events && data.fda_adverse_events.some((e: any) => e.serious));

  return (
    <div className="widget-container">
      <div className="glass-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div>
            <h1 style={{ marginBottom: '8px' }}>Interaction Analysis</h1>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-muted)' }}>Proposed Drug:</span>
              <span className="badge" style={{ background: 'var(--primary)', color: 'white', border: 'none' }}>
                {data.new_drug}
              </span>
            </div>
          </div>
          <span className={`badge ${isHighRisk ? 'high' : 'moderate'}`} style={{ fontSize: '14px', padding: '8px 16px' }}>
            {isHighRisk ? 'HIGH RISK DETECTED' : 'REVIEW REQUIRED'}
          </span>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '0.875rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px' }}>
            Patient Current Medications
          </h3>
          <ul className="med-list">
            {data.current_medications?.map((med: string) => (
              <li key={med} className="med-pill">{med}</li>
            ))}
          </ul>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '12px' }}>
            <h4 style={{ margin: '0 0 12px 0', color: '#fca5a5' }}>FDA Adverse Events</h4>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
              {data.fda_adverse_events?.length || 0} <span style={{ fontSize: '14px', fontWeight: 'normal', color: 'var(--text-muted)' }}>reports</span>
            </div>
          </div>
          
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '12px' }}>
            <h4 style={{ margin: '0 0 12px 0', color: '#6ee7b7' }}>PubMed Studies</h4>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
              {data.pubmed_research?.reduce((acc: number, curr: any) => acc + curr.result_count, 0) || 0} <span style={{ fontSize: '14px', fontWeight: 'normal', color: 'var(--text-muted)' }}>papers</span>
            </div>
          </div>
        </div>

        <div className="report-content" style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)' }}>
          <h3 style={{ marginTop: 0, color: 'var(--primary)' }}>Clinical Decision Support</h3>
          <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0, color: 'var(--text-main)', fontSize: '0.95rem' }}>
            {data.ai_instruction}
          </pre>
        </div>
      </div>
    </div>
  );
}
