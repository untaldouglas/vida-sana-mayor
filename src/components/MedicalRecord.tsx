import { useState, useEffect } from 'react'
import { getMedicalRecord, saveMedicalRecord, generateId } from '../storage'
import type { MedicalRecord, Allergy, Vaccine, Diagnosis, Surgery, FamilyHistory, Profile } from '../types'

interface MedicalRecordProps {
  profile: Profile
  showToast: (msg: string, type?: string) => void
}

type Section = 'allergies' | 'vaccines' | 'diagnoses' | 'surgeries' | 'family'

export default function MedicalRecordView({ profile, showToast }: MedicalRecordProps) {
  const [record, setRecord] = useState<MedicalRecord | null>(null)
  const [open, setOpen] = useState<Section | null>('diagnoses')
  const [modal, setModal] = useState<Section | null>(null)
  const [editItem, setEditItem] = useState<unknown>(null)

  useEffect(() => {
    getMedicalRecord(profile.id).then(setRecord)
  }, [profile.id])

  async function save(updated: MedicalRecord) {
    setRecord(updated)
    await saveMedicalRecord(updated)
    setModal(null)
    setEditItem(null)
    showToast('✅ Guardado', 'success')
  }

  if (!record) return <p className="text-muted text-center mt-24">Cargando...</p>

  const sections: { key: Section; icon: string; label: string; count: number }[] = [
    { key: 'diagnoses', icon: '🩺', label: 'Diagnósticos', count: record.diagnoses.length },
    { key: 'allergies', icon: '⚠️', label: 'Alergias', count: record.allergies.length },
    { key: 'vaccines', icon: '💉', label: 'Vacunas', count: record.vaccines.length },
    { key: 'surgeries', icon: '🏥', label: 'Cirugías', count: record.surgeries.length },
    { key: 'family', icon: '👨‍👩‍👧', label: 'Antecedentes familiares', count: record.familyHistory.length },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 800 }}>📋 Expediente clínico</h2>
        <span className="badge" style={{ background: 'var(--olive)' }}>FHIR R4</span>
      </div>

      {sections.map(s => (
        <div key={s.key} className="section-accordion">
          <button
            className="section-header"
            onClick={() => setOpen(open === s.key ? null : s.key)}
          >
            <span>{s.icon} {s.label}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {s.count > 0 && <span className="badge">{s.count}</span>}
              <span>{open === s.key ? '▲' : '▼'}</span>
            </div>
          </button>
          {open === s.key && (
            <div className="section-body">
              {s.key === 'diagnoses' && (
                <DiagnosisSection
                  items={record.diagnoses}
                  onAdd={() => { setEditItem(null); setModal('diagnoses') }}
                  onEdit={item => { setEditItem(item); setModal('diagnoses') }}
                  onDelete={id => save({ ...record, diagnoses: record.diagnoses.filter(d => d.id !== id) })}
                />
              )}
              {s.key === 'allergies' && (
                <AllergySection
                  items={record.allergies}
                  onAdd={() => { setEditItem(null); setModal('allergies') }}
                  onEdit={item => { setEditItem(item); setModal('allergies') }}
                  onDelete={id => save({ ...record, allergies: record.allergies.filter(a => a.id !== id) })}
                />
              )}
              {s.key === 'vaccines' && (
                <VaccineSection
                  items={record.vaccines}
                  onAdd={() => { setEditItem(null); setModal('vaccines') }}
                  onEdit={item => { setEditItem(item); setModal('vaccines') }}
                  onDelete={id => save({ ...record, vaccines: record.vaccines.filter(v => v.id !== id) })}
                />
              )}
              {s.key === 'surgeries' && (
                <SurgerySection
                  items={record.surgeries}
                  onAdd={() => { setEditItem(null); setModal('surgeries') }}
                  onEdit={item => { setEditItem(item); setModal('surgeries') }}
                  onDelete={id => save({ ...record, surgeries: record.surgeries.filter(s => s.id !== id) })}
                />
              )}
              {s.key === 'family' && (
                <FamilySection
                  items={record.familyHistory}
                  onAdd={() => { setEditItem(null); setModal('family') }}
                  onEdit={item => { setEditItem(item); setModal('family') }}
                  onDelete={id => save({ ...record, familyHistory: record.familyHistory.filter(f => f.id !== id) })}
                />
              )}
            </div>
          )}
        </div>
      ))}

      {/* Modals */}
      {modal === 'diagnoses' && (
        <DiagnosisForm
          initial={editItem as Diagnosis | null}
          onSave={d => save({ ...record, diagnoses: editItem ? record.diagnoses.map(x => x.id === d.id ? d : x) : [...record.diagnoses, d] })}
          onClose={() => { setModal(null); setEditItem(null) }}
        />
      )}
      {modal === 'allergies' && (
        <AllergyForm
          initial={editItem as Allergy | null}
          onSave={a => save({ ...record, allergies: editItem ? record.allergies.map(x => x.id === a.id ? a : x) : [...record.allergies, a] })}
          onClose={() => { setModal(null); setEditItem(null) }}
        />
      )}
      {modal === 'vaccines' && (
        <VaccineForm
          initial={editItem as Vaccine | null}
          onSave={v => save({ ...record, vaccines: editItem ? record.vaccines.map(x => x.id === v.id ? v : x) : [...record.vaccines, v] })}
          onClose={() => { setModal(null); setEditItem(null) }}
        />
      )}
      {modal === 'surgeries' && (
        <SurgeryForm
          initial={editItem as Surgery | null}
          onSave={s => save({ ...record, surgeries: editItem ? record.surgeries.map(x => x.id === s.id ? s : x) : [...record.surgeries, s] })}
          onClose={() => { setModal(null); setEditItem(null) }}
        />
      )}
      {modal === 'family' && (
        <FamilyForm
          initial={editItem as FamilyHistory | null}
          onSave={f => save({ ...record, familyHistory: editItem ? record.familyHistory.map(x => x.id === f.id ? f : x) : [...record.familyHistory, f] })}
          onClose={() => { setModal(null); setEditItem(null) }}
        />
      )}
    </div>
  )
}

// ---- Secciones del expediente ----

function DiagnosisSection({ items, onAdd, onEdit, onDelete }: { items: Diagnosis[]; onAdd: () => void; onEdit: (d: Diagnosis) => void; onDelete: (id: string) => void }) {
  const STATUS_LABEL: Record<string, string> = { active: 'Activo', resolved: 'Resuelto', chronic: 'Crónico' }
  return (
    <div>
      <button className="btn btn-primary btn-sm mb-8" onClick={onAdd}>+ Añadir diagnóstico</button>
      {items.length === 0 && <p className="text-muted text-sm">Sin diagnósticos registrados</p>}
      <ul className="item-list">
        {items.map(d => (
          <li key={d.id} className="item-row">
            <span className="item-icon">{d.status === 'chronic' ? '🔄' : d.status === 'resolved' ? '✅' : '⚕️'}</span>
            <div className="item-body">
              <div className="item-title">{d.condition}</div>
              <div className="item-sub">{STATUS_LABEL[d.status]} · Desde {d.onsetDate}{d.icdCode && ` · CIE: ${d.icdCode}`}</div>
              {d.notes && <div className="item-sub">{d.notes}</div>}
            </div>
            <div className="item-actions">
              <button className="btn btn-sm btn-outline" onClick={() => onEdit(d)} style={{ padding: '6px 8px', minHeight: 36 }}>✏️</button>
              <button className="btn btn-sm" onClick={() => onDelete(d.id)} style={{ padding: '6px 8px', minHeight: 36, background: '#FFECEC' }}>🗑</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function AllergySection({ items, onAdd, onEdit, onDelete }: { items: Allergy[]; onAdd: () => void; onEdit: (a: Allergy) => void; onDelete: (id: string) => void }) {
  const SEVERITY: Record<string, string> = { mild: '🟡 Leve', moderate: '🟠 Moderada', severe: '🔴 Severa' }
  return (
    <div>
      <button className="btn btn-primary btn-sm mb-8" onClick={onAdd}>+ Añadir alergia</button>
      {items.length === 0 && <p className="text-muted text-sm">Sin alergias registradas</p>}
      <ul className="item-list">
        {items.map(a => (
          <li key={a.id} className="item-row">
            <span className="item-icon">⚠️</span>
            <div className="item-body">
              <div className="item-title">{a.substance}</div>
              <div className="item-sub">{SEVERITY[a.severity]} · {a.reaction}</div>
            </div>
            <div className="item-actions">
              <button className="btn btn-sm btn-outline" onClick={() => onEdit(a)} style={{ padding: '6px 8px', minHeight: 36 }}>✏️</button>
              <button className="btn btn-sm" onClick={() => onDelete(a.id)} style={{ padding: '6px 8px', minHeight: 36, background: '#FFECEC' }}>🗑</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function VaccineSection({ items, onAdd, onEdit, onDelete }: { items: Vaccine[]; onAdd: () => void; onEdit: (v: Vaccine) => void; onDelete: (id: string) => void }) {
  return (
    <div>
      <button className="btn btn-primary btn-sm mb-8" onClick={onAdd}>+ Añadir vacuna</button>
      {items.length === 0 && <p className="text-muted text-sm">Sin vacunas registradas</p>}
      <ul className="item-list">
        {items.map(v => (
          <li key={v.id} className="item-row">
            <span className="item-icon">💉</span>
            <div className="item-body">
              <div className="item-title">{v.name}</div>
              <div className="item-sub">{v.date}{v.dose && ` · ${v.dose}`}{v.nextDate && ` · Próxima: ${v.nextDate}`}</div>
            </div>
            <div className="item-actions">
              <button className="btn btn-sm btn-outline" onClick={() => onEdit(v)} style={{ padding: '6px 8px', minHeight: 36 }}>✏️</button>
              <button className="btn btn-sm" onClick={() => onDelete(v.id)} style={{ padding: '6px 8px', minHeight: 36, background: '#FFECEC' }}>🗑</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function SurgerySection({ items, onAdd, onEdit, onDelete }: { items: Surgery[]; onAdd: () => void; onEdit: (s: Surgery) => void; onDelete: (id: string) => void }) {
  return (
    <div>
      <button className="btn btn-primary btn-sm mb-8" onClick={onAdd}>+ Añadir cirugía</button>
      {items.length === 0 && <p className="text-muted text-sm">Sin cirugías registradas</p>}
      <ul className="item-list">
        {items.map(s => (
          <li key={s.id} className="item-row">
            <span className="item-icon">🏥</span>
            <div className="item-body">
              <div className="item-title">{s.procedure}</div>
              <div className="item-sub">{s.date}{s.hospital && ` · ${s.hospital}`}{s.surgeon && ` · Dr. ${s.surgeon}`}</div>
            </div>
            <div className="item-actions">
              <button className="btn btn-sm btn-outline" onClick={() => onEdit(s)} style={{ padding: '6px 8px', minHeight: 36 }}>✏️</button>
              <button className="btn btn-sm" onClick={() => onDelete(s.id)} style={{ padding: '6px 8px', minHeight: 36, background: '#FFECEC' }}>🗑</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function FamilySection({ items, onAdd, onEdit, onDelete }: { items: FamilyHistory[]; onAdd: () => void; onEdit: (f: FamilyHistory) => void; onDelete: (id: string) => void }) {
  return (
    <div>
      <button className="btn btn-primary btn-sm mb-8" onClick={onAdd}>+ Añadir antecedente</button>
      {items.length === 0 && <p className="text-muted text-sm">Sin antecedentes familiares</p>}
      <ul className="item-list">
        {items.map(f => (
          <li key={f.id} className="item-row">
            <span className="item-icon">👨‍👩‍👧</span>
            <div className="item-body">
              <div className="item-title">{f.condition}</div>
              <div className="item-sub">{f.relation}{f.notes && ` · ${f.notes}`}</div>
            </div>
            <div className="item-actions">
              <button className="btn btn-sm btn-outline" onClick={() => onEdit(f)} style={{ padding: '6px 8px', minHeight: 36 }}>✏️</button>
              <button className="btn btn-sm" onClick={() => onDelete(f.id)} style={{ padding: '6px 8px', minHeight: 36, background: '#FFECEC' }}>🗑</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ---- Formularios ----

function DiagnosisForm({ initial, onSave, onClose }: { initial: Diagnosis | null; onSave: (d: Diagnosis) => void; onClose: () => void }) {
  const [condition, setCondition] = useState(initial?.condition ?? '')
  const [icdCode, setIcdCode] = useState(initial?.icdCode ?? '')
  const [onsetDate, setOnsetDate] = useState(initial?.onsetDate ?? '')
  const [status, setStatus] = useState<Diagnosis['status']>(initial?.status ?? 'active')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <h2 className="modal-title">🩺 Diagnóstico</h2>
        <div className="form-group"><label>Condición / Enfermedad *</label><input type="text" value={condition} onChange={e => setCondition(e.target.value)} placeholder="Ej: Diabetes tipo 2" autoFocus /></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="form-group"><label>Código CIE</label><input type="text" value={icdCode} onChange={e => setIcdCode(e.target.value)} placeholder="E11.9" /></div>
          <div className="form-group"><label>Fecha inicio</label><input type="date" value={onsetDate} onChange={e => setOnsetDate(e.target.value)} /></div>
        </div>
        <div className="form-group">
          <label>Estado</label>
          <select value={status} onChange={e => setStatus(e.target.value as Diagnosis['status'])}>
            <option value="active">Activo</option>
            <option value="chronic">Crónico</option>
            <option value="resolved">Resuelto</option>
          </select>
        </div>
        <div className="form-group"><label>Notas</label><textarea value={notes} onChange={e => setNotes(e.target.value)} /></div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-outline" onClick={onClose} style={{ flex: 1 }}>Cancelar</button>
          <button className="btn btn-primary" onClick={() => onSave({ id: initial?.id ?? generateId(), condition, icdCode: icdCode || undefined, onsetDate, status, notes: notes || undefined })} disabled={!condition} style={{ flex: 2 }}>💾 Guardar</button>
        </div>
      </div>
    </div>
  )
}

function AllergyForm({ initial, onSave, onClose }: { initial: Allergy | null; onSave: (a: Allergy) => void; onClose: () => void }) {
  const [substance, setSubstance] = useState(initial?.substance ?? '')
  const [reaction, setReaction] = useState(initial?.reaction ?? '')
  const [severity, setSeverity] = useState<Allergy['severity']>(initial?.severity ?? 'mild')
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <h2 className="modal-title">⚠️ Alergia</h2>
        <div className="form-group"><label>Sustancia *</label><input type="text" value={substance} onChange={e => setSubstance(e.target.value)} placeholder="Ej: Penicilina, mariscos..." autoFocus /></div>
        <div className="form-group"><label>Reacción</label><input type="text" value={reaction} onChange={e => setReaction(e.target.value)} placeholder="Ej: Urticaria, anafilaxia..." /></div>
        <div className="form-group"><label>Severidad</label>
          <select value={severity} onChange={e => setSeverity(e.target.value as Allergy['severity'])}>
            <option value="mild">🟡 Leve</option>
            <option value="moderate">🟠 Moderada</option>
            <option value="severe">🔴 Severa</option>
          </select>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-outline" onClick={onClose} style={{ flex: 1 }}>Cancelar</button>
          <button className="btn btn-primary" onClick={() => onSave({ id: initial?.id ?? generateId(), substance, reaction, severity, recordedDate: new Date().toISOString().split('T')[0] })} disabled={!substance} style={{ flex: 2 }}>💾 Guardar</button>
        </div>
      </div>
    </div>
  )
}

function VaccineForm({ initial, onSave, onClose }: { initial: Vaccine | null; onSave: (v: Vaccine) => void; onClose: () => void }) {
  const [name, setName] = useState(initial?.name ?? '')
  const [date, setDate] = useState(initial?.date ?? '')
  const [dose, setDose] = useState(initial?.dose ?? '')
  const [nextDate, setNextDate] = useState(initial?.nextDate ?? '')
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <h2 className="modal-title">💉 Vacuna</h2>
        <div className="form-group"><label>Nombre *</label><input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Ej: COVID-19, Influenza..." autoFocus /></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="form-group"><label>Fecha</label><input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
          <div className="form-group"><label>Dosis</label><input type="text" value={dose} onChange={e => setDose(e.target.value)} placeholder="1ra, 2da..." /></div>
        </div>
        <div className="form-group"><label>Próxima dosis</label><input type="date" value={nextDate} onChange={e => setNextDate(e.target.value)} /></div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-outline" onClick={onClose} style={{ flex: 1 }}>Cancelar</button>
          <button className="btn btn-primary" onClick={() => onSave({ id: initial?.id ?? generateId(), name, date, dose: dose || undefined, nextDate: nextDate || undefined })} disabled={!name} style={{ flex: 2 }}>💾 Guardar</button>
        </div>
      </div>
    </div>
  )
}

function SurgeryForm({ initial, onSave, onClose }: { initial: Surgery | null; onSave: (s: Surgery) => void; onClose: () => void }) {
  const [procedure, setProcedure] = useState(initial?.procedure ?? '')
  const [date, setDate] = useState(initial?.date ?? '')
  const [hospital, setHospital] = useState(initial?.hospital ?? '')
  const [surgeon, setSurgeon] = useState(initial?.surgeon ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <h2 className="modal-title">🏥 Cirugía</h2>
        <div className="form-group"><label>Procedimiento *</label><input type="text" value={procedure} onChange={e => setProcedure(e.target.value)} placeholder="Ej: Apendicectomía" autoFocus /></div>
        <div className="form-group"><label>Fecha</label><input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
        <div className="form-group"><label>Hospital</label><input type="text" value={hospital} onChange={e => setHospital(e.target.value)} /></div>
        <div className="form-group"><label>Cirujano</label><input type="text" value={surgeon} onChange={e => setSurgeon(e.target.value)} /></div>
        <div className="form-group"><label>Notas</label><textarea value={notes} onChange={e => setNotes(e.target.value)} /></div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-outline" onClick={onClose} style={{ flex: 1 }}>Cancelar</button>
          <button className="btn btn-primary" onClick={() => onSave({ id: initial?.id ?? generateId(), procedure, date, hospital: hospital || undefined, surgeon: surgeon || undefined, notes: notes || undefined })} disabled={!procedure} style={{ flex: 2 }}>💾 Guardar</button>
        </div>
      </div>
    </div>
  )
}

function FamilyForm({ initial, onSave, onClose }: { initial: FamilyHistory | null; onSave: (f: FamilyHistory) => void; onClose: () => void }) {
  const [relation, setRelation] = useState(initial?.relation ?? '')
  const [condition, setCondition] = useState(initial?.condition ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const RELATIONS = ['Padre', 'Madre', 'Hermano', 'Hermana', 'Abuelo', 'Abuela', 'Hijo', 'Hija', 'Tío', 'Tía']
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <h2 className="modal-title">👨‍👩‍👧 Antecedente familiar</h2>
        <div className="form-group">
          <label>Familiar *</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
            {RELATIONS.map(r => <button key={r} onClick={() => setRelation(r)} style={{ padding: '6px 12px', borderRadius: 20, border: `2px solid ${relation === r ? '#8A9A5B' : '#D4C9A8'}`, background: relation === r ? 'rgba(138,154,91,0.15)' : '#FDFAF3', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700, fontFamily: 'var(--font)' }}>{r}</button>)}
          </div>
          <input type="text" value={relation} onChange={e => setRelation(e.target.value)} placeholder="O escribe..." />
        </div>
        <div className="form-group"><label>Condición *</label><input type="text" value={condition} onChange={e => setCondition(e.target.value)} placeholder="Ej: Diabetes, Hipertensión..." autoFocus /></div>
        <div className="form-group"><label>Notas</label><textarea value={notes} onChange={e => setNotes(e.target.value)} /></div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-outline" onClick={onClose} style={{ flex: 1 }}>Cancelar</button>
          <button className="btn btn-primary" onClick={() => onSave({ id: initial?.id ?? generateId(), relation, condition, notes: notes || undefined })} disabled={!relation || !condition} style={{ flex: 2 }}>💾 Guardar</button>
        </div>
      </div>
    </div>
  )
}
