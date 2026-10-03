export const MOCK_API_BASE_URL = 'https://6aadfd98606bd915d1108e28.mockapi.io';
export const fallbackProducts = [{
  id: '1',
  perfumeName: 'Ladies Omnia Crystalline EDT Spray Fragrances',
  price: 105,
  perfumeDescription: 'A luminous floral fragrance with fresh notes and elegant creamy textures.',
  gender: false,
  image: 'https://cdn2.jomashop.com/media/catalog/product/b/v/bvlgari-ladies-omnia-crystalline-edt-spray-4.8-oz-150-ml-8005610481081.jpg',
  company: 'BVLGARI'
}, {
  id: '2',
  perfumeName: 'Omnia Crystalline EDT Spray',
  price: 72,
  perfumeDescription: 'An airy, refined scent with soft floral nuances and a clean finish.',
  gender: false,
  image: 'https://cdn2.jomashop.com/media/catalog/product/o/m/omnia-crystalline-edt-spray-4.8-oz-150-ml-8005610481081.jpg',
  company: 'BVLGARI'
}, {
  id: '3',
  perfumeName: 'Guilty Black by EDT Spray',
  price: 125,
  perfumeDescription: 'Smoky, spicy and warm with a bold signature blend that feels confident.',
  gender: true,
  image: 'https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=600&q=80',
  company: 'GUCCI'
}, {
  id: '4',
  perfumeName: 'Bloom EDP Spray 3.3',
  price: 98,
  perfumeDescription: 'A romantic floral perfume with fresh notes and a vivid luminous finish.',
  gender: false,
  image: 'https://cdn2.jomashop.com/media/catalog/product/g/u/gucci-ladies-gucci-bloom-edp-spray-1-oz-30-ml-8005610481081.jpg',
  company: 'GUCCI'
}];
function normalizeProduct(item) {
  return {
    id: String(item?.id ?? Math.random().toString(36).slice(2)),
    perfumeName: item?.perfumeName ?? item?.name ?? item?.perfume_name ?? 'Unknown perfume',
    price: Number(item?.price ?? 0),
    perfumeDescription: item?.perfumeDescription ?? item?.description ?? item?.perfume_description ?? 'Fresh, elegant and long-lasting fragrance.',
    gender: Boolean(item?.gender ?? false),
    image: item?.image ?? 'https://images.unsplash.com/photo-1523293182086-7651a899d37f?auto=format&fit=crop&w=600&q=80',
    company: item?.company ?? item?.brand ?? 'Unknown'
  };
}
export async function fetchMockProducts() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(`${MOCK_API_BASE_URL}/products`, {
      method: 'GET',
      headers: {
        Accept: 'application/json'
      },
      signal: controller.signal
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    const products = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
    return products.length > 0 ? products.map(normalizeProduct) : fallbackProducts;
  } catch (_error) {
    return fallbackProducts;
  } finally {
    clearTimeout(timeout);
  }
}