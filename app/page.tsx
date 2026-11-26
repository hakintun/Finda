import Home from './marketplace-client';
import { createClient } from '@/lib/supabase/server';

type Row = Record<string, any>;

export default async function Page() {
  let products: any[] = [];
  let categories: { name: string }[] = [];
  let loadError = false;

  try {
    const supabase = await createClient();
    const [productResult, categoryResult] = await Promise.all([
      supabase.from('products').select('id,name,description,price,brand,condition,created_at,seller:seller_profiles!inner(id,business_name,whatsapp,business_phone,status),category:categories(name),location:locations(neighbourhood),product_images(storage_path,position,alt_text)').eq('is_active', true).eq('availability', true).eq('seller.status', 'approved').order('created_at', { ascending: false }).limit(48),
      supabase.from('categories').select('name').eq('is_active', true).order('name'),
    ]);
    if (productResult.error || categoryResult.error) loadError = true;
    products = (productResult.data ?? []).map((row: Row) => {
      const seller = Array.isArray(row.seller) ? row.seller[0] : row.seller;
      const category = Array.isArray(row.category) ? row.category[0] : row.category;
      const location = Array.isArray(row.location) ? row.location[0] : row.location;
      const images = [...(row.product_images ?? [])].sort((a: Row, b: Row) => a.position - b.position);
      const image = images[0]?.storage_path
        ? supabase.storage.from('product-images').getPublicUrl(images[0].storage_path).data.publicUrl
        : '';
      return {
        id: row.id, name: row.name, description: row.description, price: row.price == null ? null : Number(row.price),
        brand: row.brand ?? '', condition: row.condition, seller: seller?.business_name ?? 'Local seller', sellerId: seller?.id ?? '',
        whatsapp: seller?.whatsapp ?? '', phone: seller?.business_phone ?? '', category: category?.name ?? 'Other',
        area: location?.neighbourhood ?? '', image, createdAt: row.created_at,
      };
    });
    categories = categoryResult.data ?? [];
  } catch {
    loadError = true;
  }

  return <Home products={products} categories={categories} loadError={loadError} />;
}
