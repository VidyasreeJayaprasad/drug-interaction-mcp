'use client';

import React from 'react';
import { useWidgetSDK } from '@nitrostack/widgets';

export default function PatientProfileWidget() {
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
          <h3>Awaiting Polypharmacy Analysis</h3>
          <p style={{ color: 'var(--text-muted)' }}>Run the check_polypharmacy_risk tool to generate a full patient profile report.</p>
        </div>
      </div>
    );
  }

  const highRiskPairs = data.risk_pairs?.filter((p: any) => p.risk_level === 'high') || [];
  const totalPairs = data.total_pairs_checked || 0;

  return (
    <div className="widget-container">
      <div className="glass-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div>
            <h1 style={{ marginBottom: '8px' }}>Patient Polypharmacy Profile</h1>
            <p style={{ color: 'var(--text-muted)', margin: 0 }}>
              Full audit of {data.patient_medications?.length || 0} medications.
            </p>
          </div>
          <span className={`badge ${highRiskPairs.length > 0 ? 'high' : 'low'}`} style={{ fontSize: '14px', padding: '8px 16px' }}>
            {highRiskPairs.length > 0 ? `${highRiskPairs.length} CRITICAL INTERACTIONS` : 'NO CRITICAL INTERACTIONS'}
          </span>
        </div>

        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: '12px', marginBottom: '24px' }}>
          <h3 style={{ marginTop: 0, fontSize: '0.875rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px' }}>
            Patient Current Medications
          </h3>
          <ul className="med-list">
            {data.patient_medications?.map((med: string) => (
              <li key={med} className="med-pill">{med}</li>
            ))}
          </ul>
        </div>

        <div>
          <h3 style={{ fontSize: '1.1rem', color: 'var(--primary)', marginBottom: '16px' }}>Identified Risks</h3>
          
          {data.risk_pairs?.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No interaction pairs found.</p>
          ) : (
            <div style={{ display: 'grid', gap: '12px' }}>
              {data.risk_pairs?.map((pair: any, index: number) => (
                <div key={index} style={{ 
                  background: 'rgba(255,255,255,0.03)', 
                  border: `1px solid ${pair.risk_level === 'high' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                  padding: '16px', 
                  borderRadius: '12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <strong style={{ fontSize: '1.1rem' }}>{pair.drug_a} + {pair.drug_b}</strong>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
                      FDA Events: {pair.fda_events?.length || 0} | PubMed Papers: {pair.pubmed_evidence?.length || 0}
                    </div>
                  </div>
                  <span className={`badge ${pair.risk_level}`}>
                    {pair.risk_level} RISK
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
