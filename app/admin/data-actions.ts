'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

async function adminContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Your admin session has expired. Sign in again.');
  const { data: profile, error } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (error) throw new Error(`Could not verify admin role: ${error.message}`);
  if (profile?.role !== 'admin') throw new Error('Admin access is required for this action.');
  return { supabase, user };
}

async function record(supabase: Awaited<ReturnType<typeof createClient>>, adminId: string, action: string, type: string, id: string, reason?: string) {
  const { error } = await supabase.from('admin_logs').insert({ admin_id: adminId, action, entity_type: type, entity_id: id, reason: reason || null });
  if (error) console.error('Admin audit log insert failed:', error.message);
}

export async function reviewSellerApplication(sellerId: string, status: 'approved' | 'rejected' | 'needs_information', reason = '') {
  const { supabase, user } = await adminContext();
  const { data: application, error: lookupError } = await supabase.from('seller_applications').select('id').eq('seller_id', sellerId).order('submitted_at', { ascending: false }).limit(1).maybeSingle();
  if (lookupError) return { error: lookupError.message };
  if (!application) return { error: 'No seller application was found.' };
  const { error: sellerError } = await supabase.from('seller_profiles').update({ status, updated_at: new Date().toISOString() }).eq('id', sellerId);
  if (sellerError) return { error: sellerError.message };
  const { error } = await supabase.from('seller_applications').update({ status, reviewed_by: user.id, reviewed_at: new Date().toISOString(), decision_reason: reason || null }).eq('id', application.id);
  if (error) return { error: error.message };
  await record(supabase, user.id, `seller_application_${status}`, 'seller', sellerId, reason);
  revalidatePath('/admin');
  return { success: true };
}

export async function setSellerStatus(sellerId: string, status: 'approved' | 'suspended') {
  const { supabase, user } = await adminContext();
  const { error } = await supabase.from('seller_profiles').update({ status, updated_at: new Date().toISOString() }).eq('id', sellerId);
  if (error) return { error: error.message };
  await record(supabase, user.id, `seller_${status}`, 'seller', sellerId);
  revalidatePath('/admin');
  return { success: true };
}

export async function setBuyerSuspended(userId: string, suspended: boolean) {
  const { supabase, user } = await adminContext();
  const { error } = await supabase.from('profiles').update({ suspended_at: suspended ? new Date().toISOString() : null }).eq('id', userId);
  if (error) return { error: error.message };
  await record(supabase, user.id, suspended ? 'buyer_suspended' : 'buyer_reactivated', 'buyer', userId);
  revalidatePath('/admin');
  return { success: true };
}

export async function setProductActive(productId: string, active: boolean) {
  const { supabase, user } = await adminContext();
  const { error } = await supabase.from('products').update({ is_active: active, updated_at: new Date().toISOString() }).eq('id', productId);
  if (error) return { error: error.message };
  await record(supabase, user.id, active ? 'product_restored' : 'product_disabled', 'product', productId);
  revalidatePath('/admin');
  return { success: true };
}

export async function updateReportStatus(reportId: string, status: 'reviewing' | 'resolved' | 'dismissed') {
  const { supabase, user } = await adminContext();
  const { error } = await supabase.from('reports').update({ status }).eq('id', reportId);
  if (error) return { error: error.message };
  await record(supabase, user.id, `report_${status}`, 'report', reportId);
  revalidatePath('/admin');
  return { success: true };
}

export async function createCategory(name: string) {
  const { supabase, user } = await adminContext();
  const clean = name.trim();
  if (!clean) return { error: 'Enter a category name.' };
  const slug = clean.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const { data, error } = await supabase.from('categories').insert({ name: clean, slug }).select('id').single();
  if (error) return { error: error.message };
  await record(supabase, user.id, 'category_created', 'category', String(data.id));
  revalidatePath('/admin');
  return { success: true };
}

export async function setCategoryActive(categoryId: number, active: boolean) {
  const { supabase, user } = await adminContext();
  const { error } = await supabase.from('categories').update({ is_active: active }).eq('id', categoryId);
  if (error) return { error: error.message };
  await record(supabase, user.id, active ? 'category_activated' : 'category_deactivated', 'category', String(categoryId));
  revalidatePath('/admin');
  return { success: true };
}

export async function createLocation(neighbourhood: string) {
  const { supabase, user } = await adminContext();
  const clean = neighbourhood.trim();
  if (!clean) return { error: 'Enter a neighbourhood name.' };
  const { data, error } = await supabase.from('locations').insert({ neighbourhood: clean, city: 'Port Harcourt', state: 'Rivers' }).select('id').single();
  if (error) return { error: error.message };
  await record(supabase, user.id, 'location_created', 'location', String(data.id));
  revalidatePath('/admin');
  return { success: true };
}

export async function setLocationActive(locationId: number, active: boolean) {
  const { supabase, user } = await adminContext();
  const { error } = await supabase.from('locations').update({ is_active: active }).eq('id', locationId);
  if (error) return { error: error.message };
  await record(supabase, user.id, active ? 'location_activated' : 'location_deactivated', 'location', String(locationId));
  revalidatePath('/admin');
  return { success: true };
}
