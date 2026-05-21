import { supabase } from './supabase';

export async function loadSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export function onAuthChange(callback) {
  return supabase.auth.onAuthStateChange((_event, session) => callback(session));
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getMyProfile() {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!userData.user) throw new Error('No authenticated user found.');

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userData.user.id)
    .single();
  if (error) throw error;
  return data;
}

export async function getAllData() {
  const [profiles, categories, locations, items, movements, auditLog,
    membersRes, vehiclesRes, checklistsRes, checklistItemsRes, hospitalsRes, callLogRes] = await Promise.all([
    supabase.from('profiles').select('*').order('full_name'),
    supabase.from('categories').select('*').order('name'),
    supabase.from('locations').select('*').order('name'),
    supabase.from('items').select('*, categories(name), locations(name)').order('name'),
    supabase.from('stock_movements').select('*, items(name)').order('created_at', { ascending: false }).limit(200),
    supabase.from('audit_log').select('*, profiles(full_name)').order('created_at', { ascending: false }).limit(200),
    supabase.from('members').select('*').order('last_name').order('first_name'),
    supabase.from('vehicles').select('*').order('call_sign'),
    supabase.from('checklists').select('*').order('target_type').order('target_value'),
    supabase.from('checklist_items').select('*').order('sort_order').order('created_at'),
    supabase.from('hospitals').select('*').order('name'),
    supabase.from('call_log').select('*, members(first_name, last_name)').order('call_date', { ascending: false }).order('created_at', { ascending: false }).limit(1000),
  ]);

  for (const result of [profiles, categories, locations, items, movements, auditLog]) {
    if (result.error) throw result.error;
  }
  for (const result of [membersRes, vehiclesRes, checklistsRes, checklistItemsRes, hospitalsRes, callLogRes]) {
    if (result.error) console.warn('Extended table fetch warning:', result.error.message);
  }

  const checklistMap = {};
  for (const ci of (checklistItemsRes.data || [])) {
    if (!checklistMap[ci.checklist_id]) checklistMap[ci.checklist_id] = [];
    checklistMap[ci.checklist_id].push(ci);
  }

  return {
    profiles: profiles.data || [],
    categories: categories.data || [],
    locations: locations.data || [],
    items: items.data || [],
    movements: movements.data || [],
    auditLog: auditLog.data || [],
    members: membersRes.data || [],
    vehicles: vehiclesRes.data || [],
    checklists: (checklistsRes.data || []).map(c => ({ ...c, items: checklistMap[c.id] || [] })),
    hospitals: hospitalsRes.data || [],
    callLog: callLogRes.data || [],
  };
}

function itemPayload(input) {
  const allowed = ['sku', 'name', 'category_id', 'location_id', 'quantity', 'min_quantity', 'expiration_date', 'unit', 'vendor', 'lot_number', 'notes', 'active'];
  return Object.fromEntries(allowed.map((key) => [key, input[key]]).filter(([, value]) => value !== undefined));
}

export async function createItem(item) {
  const { data, error } = await supabase.from('items').insert(itemPayload(item)).select('*, categories(name), locations(name)').single();
  if (error) throw error;
  await addAudit('Created item', 'items', data.id, data.name);
  return data;
}

export async function updateItem(id, updates) {
  const { data, error } = await supabase.from('items').update(itemPayload(updates)).eq('id', id).select('*, categories(name), locations(name)').single();
  if (error) throw error;
  await addAudit('Updated item', 'items', id, data.name);
  return data;
}

export async function deleteItem(id, name) {
  const { error } = await supabase.from('items').delete().eq('id', id);
  if (error) throw error;
  await addAudit('Deleted item', 'items', id, name || id);
}

export async function createCategory(name) {
  const { data, error } = await supabase.from('categories').insert({ name }).select('*').single();
  if (error) throw error;
  await addAudit('Created category', 'categories', data.id, name);
  return data;
}

export async function createLocation(name) {
  const { data, error } = await supabase.from('locations').insert({ name }).select('*').single();
  if (error) throw error;
  await addAudit('Created location', 'locations', data.id, name);
  return data;
}

export async function applyStockMovement(itemId, movementType, quantity, note) {
  const { data, error } = await supabase.rpc('apply_stock_movement', {
    p_item_id: itemId,
    p_movement_type: movementType,
    p_quantity: Number(quantity),
    p_note: note || null,
  });
  if (error) throw error;
  return data;
}

export async function updateProfileRole(id, role) {
  const { data, error } = await supabase.from('profiles').update({ role }).eq('id', id).select('*').single();
  if (error) throw error;
  await addAudit('Updated user role', 'profiles', id, role);
  return data;
}

export async function addAudit(action, entity, entityId, detail) {
  const { error } = await supabase.rpc('log_audit', {
    action,
    entity,
    entity_id: entityId,
    detail,
  });
  if (error) console.warn('Audit insert failed', error);
}

// ── Members ───────────────────────────────────────────────────────────────────
const MEMBER_FIELDS = [
  'first_name', 'last_name', 'email', 'phone', 'address', 'city', 'state', 'zip',
  'date_of_birth', 'date_joined', 'cert_level', 'cert_number', 'cert_expiration',
  'emergency_contact_name', 'emergency_contact_phone', 'status', 'notes',
  'avatar_url', 'number_of_calls', 'oos', 'call_sign', 'hatzalah_web_id',
];

function memberPayload(input) {
  return Object.fromEntries(MEMBER_FIELDS.map(k => [k, input[k]]).filter(([, v]) => v !== undefined));
}

export async function createMember(member) {
  const { data, error } = await supabase.from('members').insert(memberPayload(member)).select('*').single();
  if (error) throw error;
  await addAudit('Created member', 'members', data.id, `${data.first_name} ${data.last_name}`);
  return data;
}

export async function updateMember(id, updates) {
  const { data, error } = await supabase.from('members').update(memberPayload(updates)).eq('id', id).select('*').single();
  if (error) throw error;
  await addAudit('Updated member', 'members', id, `${data.first_name} ${data.last_name}`);
  return data;
}

export async function deleteMember(id, name) {
  const { error } = await supabase.from('members').delete().eq('id', id);
  if (error) throw error;
  await addAudit('Deleted member', 'members', id, name || id);
}

// ── Vehicles ──────────────────────────────────────────────────────────────────
const VEHICLE_FIELDS = [
  'call_sign', 'type', 'mileage', 'last_service', 'next_service',
  'purchase_date', 'purchase_price', 'description',
  'license_plate_number', 'driver_license_number', 'driver_license_state',
  'driver_license_expiration', 'avatar_url',
];

function vehiclePayload(input) {
  return Object.fromEntries(VEHICLE_FIELDS.map(k => [k, input[k]]).filter(([, v]) => v !== undefined));
}

export async function createVehicle(vehicle) {
  const { data, error } = await supabase.from('vehicles').insert(vehiclePayload(vehicle)).select('*').single();
  if (error) throw error;
  await addAudit('Created vehicle', 'vehicles', data.id, data.call_sign);
  return data;
}

export async function updateVehicle(id, updates) {
  const { data, error } = await supabase.from('vehicles').update(vehiclePayload(updates)).eq('id', id).select('*').single();
  if (error) throw error;
  await addAudit('Updated vehicle', 'vehicles', id, data.call_sign);
  return data;
}

export async function deleteVehicle(id, callSign) {
  const { error } = await supabase.from('vehicles').delete().eq('id', id);
  if (error) throw error;
  await addAudit('Deleted vehicle', 'vehicles', id, callSign || id);
}

// ── Hospitals ─────────────────────────────────────────────────────────────────
const HOSPITAL_FIELDS = [
  'name', 'address', 'city', 'state', 'zip', 'phone', 'fax', 'email',
  'website', 'specialties', 'access_code', 'latitude', 'longitude', 'notes',
];

function hospitalPayload(input) {
  return Object.fromEntries(HOSPITAL_FIELDS.map(k => [k, input[k]]).filter(([, v]) => v !== undefined));
}

export async function createHospital(hospital) {
  const { data, error } = await supabase.from('hospitals').insert(hospitalPayload(hospital)).select('*').single();
  if (error) throw error;
  await addAudit('Created hospital', 'hospitals', data.id, data.name);
  return data;
}

export async function updateHospital(id, updates) {
  const { data, error } = await supabase.from('hospitals').update(hospitalPayload(updates)).eq('id', id).select('*').single();
  if (error) throw error;
  await addAudit('Updated hospital', 'hospitals', id, data.name);
  return data;
}

export async function deleteHospital(id, name) {
  const { error } = await supabase.from('hospitals').delete().eq('id', id);
  if (error) throw error;
  await addAudit('Deleted hospital', 'hospitals', id, name || id);
}

// ── Call Log ──────────────────────────────────────────────────────────────────
const CALL_LOG_FIELDS = ['member_id', 'call_date', 'call_time', 'incident_number', 'call_type', 'location', 'disposition', 'notes'];

function callLogPayload(input) {
  return Object.fromEntries(CALL_LOG_FIELDS.map(k => [k, input[k]]).filter(([, v]) => v !== undefined));
}

export async function createCallLog(entry) {
  const { data, error } = await supabase.from('call_log').insert(callLogPayload(entry)).select('*, members(first_name, last_name)').single();
  if (error) throw error;
  return data;
}

export async function updateCallLog(id, updates) {
  const { data, error } = await supabase.from('call_log').update(callLogPayload(updates)).eq('id', id).select('*, members(first_name, last_name)').single();
  if (error) throw error;
  return data;
}

export async function deleteCallLog(id) {
  const { error } = await supabase.from('call_log').delete().eq('id', id);
  if (error) throw error;
}

// ── Checklist Items ───────────────────────────────────────────────────────────
export async function createChecklistItem(checklistId, itemName, notes) {
  const { data, error } = await supabase.from('checklist_items')
    .insert({ checklist_id: checklistId, item_name: itemName, notes: notes || null, sort_order: 0 })
    .select('*').single();
  if (error) throw error;
  return data;
}

export async function updateChecklistItem(id, updates) {
  const { data, error } = await supabase.from('checklist_items')
    .update({ item_name: updates.item_name, notes: updates.notes || null })
    .eq('id', id).select('*').single();
  if (error) throw error;
  return data;
}

export async function deleteChecklistItem(id) {
  const { error } = await supabase.from('checklist_items').delete().eq('id', id);
  if (error) throw error;
}
