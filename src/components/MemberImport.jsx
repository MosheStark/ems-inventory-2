import { useRef, useState } from 'react';
import { CheckCircle, Upload, X, AlertCircle } from 'lucide-react';
import { createMember } from '../lib/api';

const FIELDS = [
  { key: 'first_name',              label: 'First Name',              required: true },
  { key: 'last_name',               label: 'Last Name',               required: true },
  { key: 'email',                   label: 'Email' },
  { key: 'phone',                   label: 'Phone' },
  { key: 'address',                 label: 'Address' },
  { key: 'city',                    label: 'City' },
  { key: 'state',                   label: 'State' },
  { key: 'zip',                     label: 'ZIP' },
  { key: 'date_of_birth',           label: 'Date of Birth' },
  { key: 'date_joined',             label: 'Date Joined' },
  { key: 'status',                  label: 'Status' },
  { key: 'cert_level',              label: 'Cert Level' },
  { key: 'cert_number',             label: 'Cert Number' },
  { key: 'cert_expiration',         label: 'Cert Expiration' },
  { key: 'emergency_contact_name',  label: 'Emergency Contact Name' },
  { key: 'emergency_contact_phone', label: 'Emergency Contact Phone' },
  { key: 'notes',                   label: 'Notes' },
  { key: 'number_of_calls',         label: 'Number of Calls' },
  { key: 'call_sign',               label: 'Call Sign' },
  { key: 'hatzalah_web_id',         label: 'HatzalahWeb ID' },
];

const ALIASES = {
  first_name:              ['first name','firstname','first','fname','given name','given'],
  last_name:               ['last name','lastname','last','lname','surname','family name','family'],
  email:                   ['email','email address','e-mail','e mail'],
  phone:                   ['phone','phone number','mobile','cell','telephone','tel'],
  address:                 ['address','street','street address','addr'],
  city:                    ['city','town'],
  state:                   ['state','province','st'],
  zip:                     ['zip','zip code','postal','postal code'],
  date_of_birth:           ['date of birth','dob','birth date','birthday','birth'],
  date_joined:             ['date joined','joined','join date','member since','start date'],
  status:                  ['status','member status','active status'],
  cert_level:              ['cert level','certification','cert','certification level','emt level','ems level','level'],
  cert_number:             ['cert number','certification number','cert #','ems id','emt number'],
  cert_expiration:         ['cert expiration','cert exp','certification expiration','cert expires','expiration'],
  emergency_contact_name:  ['emergency contact','emergency contact name','ec name','emergency name'],
  emergency_contact_phone: ['emergency contact phone','ec phone','emergency phone'],
  notes:                   ['notes','note','comments','comment'],
  number_of_calls:         ['calls','number of calls','call count','total calls','num calls'],
  call_sign:               ['call sign','callsign','unit','radio id','radio'],
  hatzalah_web_id:         ['hatzalahweb id','hatzalah web id','web id','hwid','hatzalah id'],
};

const VALID_STATUSES    = ['Primary','Backup','Observer','Trainee','Inactive'];
const VALID_CERT_LEVELS = ['None','Lay Responder','First Responder','EMT-B','AEMT','Paramedic','Other'];

function parseCSV(text) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim().split('\n');
  if (lines.length < 2) return { headers: [], rows: [] };
  return { headers: parseRow(lines[0]), rows: lines.slice(1).filter(l => l.trim()).map(parseRow) };
}

function parseRow(line) {
  const result = [];
  let cur = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') { inQ = !inQ; }
    else if (line[i] === ',' && !inQ) { result.push(cur.trim()); cur = ''; }
    else { cur += line[i]; }
  }
  result.push(cur.trim());
  return result;
}

function autoMap(headers) {
  const map = {};
  for (const [field, aliases] of Object.entries(ALIASES)) {
    const idx = headers.findIndex(h => aliases.includes(h.toLowerCase().trim()));
    map[field] = idx >= 0 ? String(idx) : '';
  }
  return map;
}

function coerceDate(val) {
  if (!val || !val.trim()) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function buildMember(raw, mapping) {
  const obj = {};
  for (const { key } of FIELDS) {
    const idx = mapping[key];
    if (idx === '' || idx === undefined) continue;
    const val = (raw[Number(idx)] ?? '').trim();
    if (!val) continue;
    if (key === 'status') {
      obj[key] = VALID_STATUSES.find(s => s.toLowerCase() === val.toLowerCase()) || 'Trainee';
    } else if (key === 'cert_level') {
      obj[key] = VALID_CERT_LEVELS.find(l => l.toLowerCase() === val.toLowerCase()) || 'None';
    } else if (key === 'number_of_calls') {
      obj[key] = parseInt(val, 10) || 0;
    } else if (['date_of_birth', 'date_joined', 'cert_expiration'].includes(key)) {
      obj[key] = coerceDate(val);
    } else {
      obj[key] = val;
    }
  }
  return obj;
}

const fLabel = { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, fontWeight: 600, color: '#64748b' };

export default function MemberImport({ onClose, refresh }) {
  const fileRef = useRef();
  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);
  const [mapping, setMapping] = useState({});
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState(null);

  function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const { headers: h, rows: r } = parseCSV(ev.target.result);
      setHeaders(h);
      setRows(r);
      setMapping(autoMap(h));
      setResults(null);
    };
    reader.readAsText(file);
  }

  const preview = rows.slice(0, 5).map(r => buildMember(r, mapping));
  const readyCount = rows.filter(r => {
    const m = buildMember(r, mapping);
    return m.first_name && m.last_name;
  }).length;

  async function runImport() {
    setImporting(true);
    let ok = 0;
    const errors = [];
    for (const raw of rows) {
      const m = buildMember(raw, mapping);
      if (!m.first_name || !m.last_name) { errors.push(`Skipped row — missing name`); continue; }
      try { await createMember(m); ok++; }
      catch (err) { errors.push(`${m.first_name} ${m.last_name}: ${err.message}`); }
    }
    setResults({ ok, errors });
    setImporting(false);
    await refresh();
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 100, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 16px', overflowY: 'auto' }}>
      <div className="card" style={{ width: '100%', maxWidth: 820, position: 'relative' }}>
        <button className="icon" style={{ position: 'absolute', top: 16, right: 16 }} onClick={onClose}><X size={18} /></button>
        <h2 style={{ marginBottom: 4 }}>Import Members from CSV</h2>
        <p style={{ color: '#64748b', fontSize: 13, marginBottom: 20 }}>Upload a CSV file. Column headers will be auto-matched — adjust the mapping below as needed.</p>

        {/* File picker */}
        <div style={{ marginBottom: 20 }}>
          <input ref={fileRef} type="file" accept=".csv,text/csv" style={{ display: 'none' }} onChange={handleFile} />
          <button className="secondary" onClick={() => fileRef.current.click()}><Upload size={16} /> Choose CSV File</button>
          {rows.length > 0 && <span style={{ marginLeft: 12, fontSize: 13, color: '#64748b' }}>{rows.length} rows found</span>}
        </div>

        {headers.length > 0 && !results && (
          <>
            {/* Column mapping */}
            <h3 style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '.04em', color: '#64748b', marginBottom: 12 }}>Column Mapping</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10, marginBottom: 24 }}>
              {FIELDS.map(({ key, label, required }) => (
                <label key={key} style={fLabel}>
                  {label}{required && <span style={{ color: '#ef4444' }}> *</span>}
                  <select value={mapping[key] ?? ''} onChange={e => setMapping(p => ({ ...p, [key]: e.target.value }))}>
                    <option value="">— skip —</option>
                    {headers.map((h, i) => <option key={i} value={String(i)}>{h}</option>)}
                  </select>
                </label>
              ))}
            </div>

            {/* Preview */}
            {preview.length > 0 && (
              <>
                <h3 style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '.04em', color: '#64748b', marginBottom: 12 }}>Preview (first {preview.length} rows)</h3>
                <div className="table-wrap" style={{ marginBottom: 20 }}>
                  <table style={{ fontSize: 13 }}>
                    <thead><tr>
                      {FIELDS.filter(f => mapping[f.key] !== '').map(f => <th key={f.key}>{f.label}</th>)}
                    </tr></thead>
                    <tbody>{preview.map((m, i) => (
                      <tr key={i}>
                        {FIELDS.filter(f => mapping[f.key] !== '').map(f => (
                          <td key={f.key}>{m[f.key] != null ? String(m[f.key]) : <span style={{ color: '#cbd5e1' }}>—</span>}</td>
                        ))}
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              </>
            )}

            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <button className="primary" disabled={importing || readyCount === 0} onClick={runImport}>
                {importing ? 'Importing…' : `Import ${readyCount} Member${readyCount !== 1 ? 's' : ''}`}
              </button>
              <button className="secondary" onClick={onClose}>Cancel</button>
              {readyCount < rows.length && (
                <span style={{ fontSize: 13, color: '#f59e0b' }}>
                  {rows.length - readyCount} row{rows.length - readyCount !== 1 ? 's' : ''} will be skipped (missing name)
                </span>
              )}
            </div>
          </>
        )}

        {/* Results */}
        {results && (
          <div className="stack" style={{ gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <CheckCircle size={20} color="#10b981" />
              <span style={{ fontWeight: 700, fontSize: 16 }}>{results.ok} member{results.ok !== 1 ? 's' : ''} imported successfully</span>
            </div>
            {results.errors.length > 0 && (
              <div className="alert danger-text">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <AlertCircle size={16} /><b>{results.errors.length} error{results.errors.length !== 1 ? 's' : ''}</b>
                </div>
                {results.errors.map((e, i) => <div key={i} style={{ fontSize: 13 }}>{e}</div>)}
              </div>
            )}
            <button className="primary" onClick={onClose}>Done</button>
          </div>
        )}
      </div>
    </div>
  );
}
