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
  const [profiles, categories, locations, items, movements, auditLog] = await Promise.all([
    supabase.from('profiles').select('*').order('full_name'),
    supabase.from('categories').select('*').order('name'),
    supabase.from('locations').select('*').order('name'),
    supabase.from('items').select('*, categories(name), locations(name)').order('name'),
    supabase.from('stock_movements').select('*, items(name)').order('created_at', { ascending: false }).limit(200),
    supabase.from('audit_log').select('*, profiles(full_name)').order('created_at', { ascending: false }).limit(200),
  ]);

  for (const result of [profiles, categories, locations, items, movements, auditLog]) {
    if (result.error) throw result.error;
  }

  return {
    profiles: profiles.data || [],
    categories: categories.data || [],
    locations: locations.data || [],
    items: items.data || [],
    movements: movements.data || [],
    auditLog: auditLog.data || [],
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
