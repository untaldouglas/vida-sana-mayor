import { useEffect, useState } from 'react'
import { getMedicalRecord, getDoctors, getVitalSigns } from '../storage'
import type { Profile, MedicalRecord, Doctor, VitalSign } from '../types'

interface Props {
  profile: Profile
  onClose: () => void
}

export default function PrintRecord({ profile, onClose }: Props) {
  const [record, setRecord]   = useState<MedicalRecord | null>(null)
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [vitals, setVitals]   = useState<VitalSign[]>([])

  useEffect(() => {
    Promise.all([
      getMedicalRecord(profile.id),
      getDoctors(profile.id),
      getVitalSigns(profile.id),
    ]).then(([r, d, v]) => { setRecord(r); setDoctors(d); setVitals(v) })
  }, [profile.id])

  const today = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9998, background: '#fff', overflowY: 'auto', fontFamily: 'Georgia, serif' }}>

      {/* Controles — se ocultan al imprimir */}
      <div className="no-print" style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: '#2c3e50', padding: '12px 16px',
        display: 'flex', gap: 10, alignItems: 'center',
      }}>
        <button
          onClick={() => window.print()}
          style={{
            flex: 1, padding: '11px', borderRadius: 10, border: 'none', cursor: 'pointer',
            background: '#27ae60', color: '#fff', fontWeight: 800, fontSize: '1rem', fontFamily: 'var(--font)',
          }}
        >
          🖨️ Imprimir / Guardar PDF
        </button>
        <button
          onClick={onClose}
          style={{
            padding: '11px 18px', borderRadius: 10, border: 'none', cursor: 'pointer',
            background: 'rgba(255,255,255,0.15)', color: '#fff', fontWeight: 700, fontFamily: 'var(--font)',
          }}
        >
          ✕ Cerrar
        </button>
      </div>

      {/* Contenido imprimible */}
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 20px 48px' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', borderBottom: '3px solid #2c3e50', paddingBottom: 16, marginBottom: 24 }}>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#2c3e50' }}>
            {profile.avatar} {profile.name}
          </div>
          <div style={{ fontSize: '0.9rem', color: '#666', marginTop: 4 }}>
            Expediente clínico generado por <strong>Vida Sana Mayor</strong> · {today}
          </div>
          {profile.bloodType && (
            <div style={{ display: 'inline-block', marginTop: 8, padding: '4px 16px', background: '#e74c3c', color: '#fff', borderRadius: 20, fontWeight: 800 }}>
              Tipo {profile.bloodType}
            </div>
          )}
          {profile.emergencyContactName && (
            <div style={{ fontSize: '0.85rem', marginTop: 6, color: '#555' }}>
              Contacto de emergencia: <strong>{profile.emergencyContactName}</strong>
              {profile.emergencyContactPhone && ` · ${profile.emergencyContactPhone}`}
            </div>
          )}
        </div>

        {!record ? (
          <p style={{ textAlign: 'center', color: '#999' }}>Cargando datos…</p>
        ) : (
          <>
            {/* Alergias */}
            {record.allergies.length > 0 && (
              <PrintSection title="⚠️ ALERGIAS" accent="#FFECEC" titleColor="#c0392b">
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                  <thead>
                    <tr style={{ background: '#fdf' }}>
                      <Th>Sustancia</Th><Th>Reacción</Th><Th>Severidad</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {record.allergies.map(a => (
                      <tr key={a.id}>
                        <Td><strong>{a.substance}</strong></Td>
                        <Td>{a.reaction}</Td>
                        <Td>{a.severity === 'severe' ? 'Severa' : a.severity === 'moderate' ? 'Moderada' : 'Leve'}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </PrintSection>
            )}

            {/* Diagnósticos */}
            {record.diagnoses.length > 0 && (
              <PrintSection title="🩺 DIAGNÓSTICOS">
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                  <thead>
                    <tr><Th>Condición</Th><Th>CIE-10</Th><Th>Estado</Th><Th>Desde</Th></tr>
                  </thead>
                  <tbody>
                    {record.diagnoses.map(d => (
                      <tr key={d.id}>
                        <Td><strong>{d.condition}</strong></Td>
                        <Td>{d.icdCode ?? '—'}</Td>
                        <Td>{d.status === 'chronic' ? 'Crónica' : d.status === 'active' ? 'Activa' : 'Resuelta'}</Td>
                        <Td>{d.onsetDate}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </PrintSection>
            )}

            {/* Medicamentos */}
            {record.medications.length > 0 && (
              <PrintSection title="💊 MEDICAMENTOS">
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                  <thead>
                    <tr><Th>Medicamento</Th><Th>Dosis</Th><Th>Frecuencia</Th><Th>Horarios</Th></tr>
                  </thead>
                  <tbody>
                    {record.medications.map(m => (
                      <tr key={m.id}>
                        <Td><strong>{m.name}</strong></Td>
                        <Td>{m.dose}</Td>
                        <Td>{m.frequency}</Td>
                        <Td>{m.times.join(', ')}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </PrintSection>
            )}

            {/* Doctores */}
            {doctors.length > 0 && (
              <PrintSection title="👨‍⚕️ MÉDICOS">
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                  <thead>
                    <tr><Th>Nombre</Th><Th>Especialidad</Th><Th>Teléfono</Th></tr>
                  </thead>
                  <tbody>
                    {doctors.map(d => (
                      <tr key={d.id}>
                        <Td><strong>{d.name}</strong></Td>
                        <Td>{d.specialty}</Td>
                        <Td>{d.phone ?? '—'}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </PrintSection>
            )}

            {/* Vacunas */}
            {record.vaccines.length > 0 && (
              <PrintSection title="💉 VACUNAS">
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                  <thead>
                    <tr><Th>Vacuna</Th><Th>Fecha</Th><Th>Dosis</Th><Th>Próxima dosis</Th></tr>
                  </thead>
                  <tbody>
                    {record.vaccines.map(v => (
                      <tr key={v.id}>
                        <Td><strong>{v.name}</strong></Td>
                        <Td>{v.date}</Td>
                        <Td>{v.dose ?? '—'}</Td>
                        <Td>{v.nextDate ?? '—'}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </PrintSection>
            )}

            {/* Cirugías */}
            {record.surgeries.length > 0 && (
              <PrintSection title="🔪 ANTECEDENTES QUIRÚRGICOS">
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                  <thead>
                    <tr><Th>Procedimiento</Th><Th>Fecha</Th><Th>Hospital</Th></tr>
                  </thead>
                  <tbody>
                    {record.surgeries.map(s => (
                      <tr key={s.id}>
                        <Td><strong>{s.procedure}</strong></Td>
                        <Td>{s.date}</Td>
                        <Td>{s.hospital ?? '—'}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </PrintSection>
            )}

            {/* Antecedentes familiares */}
            {record.familyHistory.length > 0 && (
              <PrintSection title="👪 ANTECEDENTES FAMILIARES">
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                  <thead>
                    <tr><Th>Parentesco</Th><Th>Condición</Th></tr>
                  </thead>
                  <tbody>
                    {record.familyHistory.map(f => (
                      <tr key={f.id}>
                        <Td>{f.relation}</Td>
                        <Td><strong>{f.condition}</strong></Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </PrintSection>
            )}

            {/* Últimos signos vitales */}
            {vitals.length > 0 && (
              <PrintSection title="📊 ÚLTIMOS SIGNOS VITALES">
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                  <thead>
                    <tr><Th>Tipo</Th><Th>Valor</Th><Th>Unidad</Th><Th>Fecha</Th></tr>
                  </thead>
                  <tbody>
                    {vitals.slice(0, 20).map(v => (
                      <tr key={v.id}>
                        <Td>{v.type === 'bp' ? 'Presión arterial' : v.type === 'glucose' ? 'Glucosa' : v.type === 'weight' ? 'Peso' : v.type === 'heartRate' ? 'Frec. cardíaca' : v.type === 'temp' ? 'Temperatura' : 'Saturación O₂'}</Td>
                        <Td><strong>{v.value2 != null ? `${v.value}/${v.value2}` : v.value}</strong></Td>
                        <Td>{v.unit}</Td>
                        <Td>{v.date} {v.time}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </PrintSection>
            )}

            {/* Consultas */}
            {record.consultations.length > 0 && (
              <PrintSection title="📋 CONSULTAS MÉDICAS">
                {record.consultations.slice(0, 10).map(c => {
                  const dr = doctors.find(d => d.id === c.doctorId)
                  return (
                    <div key={c.id} style={{ marginBottom: 10, paddingBottom: 10, borderBottom: '1px solid #eee' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                        {c.date} {dr ? `· Dr. ${dr.name}` : ''}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#444', marginTop: 2 }}>
                        <strong>Motivo:</strong> {c.reason}
                      </div>
                      {c.notes && (
                        <div style={{ fontSize: '0.83rem', color: '#666', marginTop: 2 }}>
                          <strong>Notas:</strong> {c.notes}
                        </div>
                      )}
                    </div>
                  )
                })}
              </PrintSection>
            )}

            <div style={{ marginTop: 32, textAlign: 'center', color: '#aaa', fontSize: '0.78rem', borderTop: '1px solid #eee', paddingTop: 16 }}>
              Generado por Vida Sana Mayor · App 100% offline y privada · {today}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Sub-componentes de impresión ──────────────────────────────

function PrintSection({ title, accent, titleColor, children }: {
  title: string; accent?: string; titleColor?: string; children: React.ReactNode
}) {
  return (
    <div style={{ marginBottom: 24, pageBreakInside: 'avoid' }}>
      <div style={{
        fontWeight: 900, fontSize: '0.85rem', letterSpacing: 1,
        color: titleColor ?? '#2c3e50', borderBottom: `2px solid ${titleColor ?? '#2c3e50'}`,
        paddingBottom: 4, marginBottom: 10,
        background: accent, padding: accent ? '6px 10px' : undefined,
        borderRadius: accent ? 6 : undefined,
      }}>
        {title}
      </div>
      {children}
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th style={{
      textAlign: 'left', padding: '6px 8px',
      fontSize: '0.78rem', fontWeight: 700, color: '#555',
      borderBottom: '1px solid #ddd', background: '#f5f5f5',
    }}>
      {children}
    </th>
  )
}

function Td({ children }: { children: React.ReactNode }) {
  return (
    <td style={{ padding: '6px 8px', borderBottom: '1px solid #eee', fontSize: '0.85rem', color: '#333' }}>
      {children}
    </td>
  )
}
