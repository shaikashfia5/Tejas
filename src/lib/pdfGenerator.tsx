import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
} from '@react-pdf/renderer';
import type { BriefSnapshot } from '../types/database';

const styles = StyleSheet.create({
  page: {
    padding: 36,
    backgroundColor: '#0f172a',
    color: '#ffffff',
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#f59e0b',
    paddingBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#f59e0b',
  },
  subtitle: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 3,
  },
  badge: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 9,
    color: '#38bdf8',
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 10,
  },
  card: {
    width: '48%',
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 10,
    color: '#94a3b8',
    textTransform: 'uppercase',
  },
  cardValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 4,
  },
  cardSub: {
    fontSize: 8,
    color: '#64748b',
    marginTop: 2,
  },
  proofSection: {
    marginTop: 15,
    backgroundColor: '#1e293b',
    padding: 12,
    borderRadius: 8,
  },
  proofTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#f59e0b',
    marginBottom: 6,
  },
  proofRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  proofLabel: {
    fontSize: 9,
    color: '#cbd5e1',
  },
  proofValue: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 36,
    right: 36,
    textAlign: 'center',
    fontSize: 8,
    color: '#64748b',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 8,
  },
});

export const BriefPdfDocument: React.FC<{ snapshot: BriefSnapshot; token: string }> = ({
  snapshot,
  token,
}) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Tejas — Financial Continuity Passport</Text>
        <Text style={styles.subtitle}>
          Verified Financial Profile Snapshot • Token: {token}
        </Text>
        <Text style={styles.badge}>
          Consent-Based Micro-Enterprise Verification
        </Text>
      </View>

      {/* Profile Overview */}
      <View style={{ marginBottom: 12 }}>
        <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#ffffff' }}>
          Applicant: {snapshot.profileName}
        </Text>
        <Text style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>
          Income Model: {snapshot.incomeType.toUpperCase()} • Goal: {snapshot.goal.replace('_', ' ').toUpperCase()}
        </Text>
      </View>

      {/* Indicators Grid */}
      <View style={styles.grid}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Resilience Buffer</Text>
          <Text style={styles.cardValue}>{snapshot.bufferDays} Days</Text>
          <Text style={styles.cardSub}>Surplus runway covering core obligations</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Income Rhythm</Text>
          <Text style={[styles.cardValue, { textTransform: 'capitalize' }]}>
            {snapshot.incomeRhythm}
          </Text>
          <Text style={styles.cardSub}>Cash flow regularity score</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Monthly Inflows (30d)</Text>
          <Text style={styles.cardValue}>
            ₹{snapshot.totalIncome30d?.toLocaleString('en-IN') || '0'}
          </Text>
          <Text style={styles.cardSub}>Total income recorded</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Monthly Outflows (30d)</Text>
          <Text style={styles.cardValue}>
            ₹{snapshot.totalExpenses30d?.toLocaleString('en-IN') || '0'}
          </Text>
          <Text style={styles.cardSub}>Total operational & personal spend</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Goal Readiness</Text>
          <Text style={styles.cardValue}>{snapshot.goalReadiness}%</Text>
          <Text style={styles.cardSub}>Estimated target surplus achieved</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Active Obligations</Text>
          <Text style={styles.cardValue}>
            {snapshot.obligationCount} (₹{snapshot.obligationTotal?.toLocaleString('en-IN')})
          </Text>
          <Text style={styles.cardSub}>Upcoming payment commitments</Text>
        </View>
      </View>

      {/* Proof Strength Breakdown */}
      <View style={styles.proofSection}>
        <Text style={styles.proofTitle}>Evidence & Provenance Breakdown</Text>
        <View style={styles.proofRow}>
          <Text style={styles.proofLabel}>Verified Proofs (OCR / Bank / UPI receipts)</Text>
          <Text style={styles.proofValue}>{snapshot.proofStrength?.verified || 0}</Text>
        </View>
        <View style={styles.proofRow}>
          <Text style={styles.proofLabel}>Declared Records (Manual log)</Text>
          <Text style={styles.proofValue}>{snapshot.proofStrength?.declared || 0}</Text>
        </View>
        <View style={styles.proofRow}>
          <Text style={styles.proofLabel}>Estimated Projections</Text>
          <Text style={styles.proofValue}>{snapshot.proofStrength?.estimated || 0}</Text>
        </View>
        <View style={[styles.proofRow, { borderBottomWidth: 0, marginTop: 4 }]}>
          <Text style={[styles.proofLabel, { fontWeight: 'bold' }]}>Total Evidence Base</Text>
          <Text style={[styles.proofValue, { color: '#f59e0b' }]}>
            {snapshot.proofStrength?.total || snapshot.evidenceCount || 0} items
          </Text>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text>
          Generated via Tejas Financial Continuity PWA • Consent-based read-only snapshot.
        </Text>
        <Text style={{ marginTop: 2 }}>
          Snapshot Generated: {new Date(snapshot.generatedAt).toUTCString()}
        </Text>
      </View>
    </Page>
  </Document>
);

export async function downloadBriefPdf(snapshot: BriefSnapshot, token: string) {
  const blob = await pdf(<BriefPdfDocument snapshot={snapshot} token={token} />).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tejas-brief-${token}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
