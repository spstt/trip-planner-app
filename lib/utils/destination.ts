export interface DestinationInfo {
  title: string
  extract: string      // short description
  imageUrl: string | null
  imageThumb: string | null
  wikiUrl: string | null
}

// Wikipedia REST API — free, no key needed
// Tries English first, then strips to city name if needed
export async function fetchDestinationInfo(destination: string): Promise<DestinationInfo | null> {
  // Extract city name (take first part before comma)
  const city = destination.split(',')[0].trim()

  // Try a few name variations
  const candidates = [
    city,
    city.replace(/\s+/g, '_'),
    // common Thai->English mappings for popular destinations
    city === 'โตเกียว' ? 'Tokyo' : null,
    city === 'โอซาก้า' || city === 'โอซากา' ? 'Osaka' : null,
    city === 'ปารีส' ? 'Paris' : null,
    city === 'นิวยอร์ก' ? 'New_York_City' : null,
    city === 'ลอนดอน' ? 'London' : null,
    city === 'สิงคโปร์' ? 'Singapore' : null,
    city === 'กรุงเทพ' || city === 'กรุงเทพฯ' ? 'Bangkok' : null,
    city === 'เชียงใหม่' ? 'Chiang_Mai' : null,
    city === 'ภูเก็ต' ? 'Phuket' : null,
    city === 'บาหลี' ? 'Bali' : null,
    city === 'โซล' ? 'Seoul' : null,
    city === 'ปักกิ่ง' ? 'Beijing' : null,
    city === 'เซี่ยงไฮ้' ? 'Shanghai' : null,
    city === 'ฮ่องกง' ? 'Hong_Kong' : null,
    city === 'ดูไบ' ? 'Dubai' : null,
    city === 'บาร์เซโลนา' ? 'Barcelona' : null,
    city === 'โรม' ? 'Rome' : null,
    city === 'เวนิส' ? 'Venice' : null,
    city === 'อิสตันบูล' ? 'Istanbul' : null,
    city === 'อัมสเตอร์ดัม' ? 'Amsterdam' : null,
    city === 'ซิดนีย์' ? 'Sydney' : null,
    city === 'มะนิลา' ? 'Manila' : null,
    city === 'กัวลาลัมเปอร์' ? 'Kuala_Lumpur' : null,
    city === 'จาการ์ตา' ? 'Jakarta' : null,
  ].filter(Boolean) as string[]

  for (const name of candidates) {
    try {
      const res = await fetch(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name)}`,
        { next: { revalidate: 86400 } } // cache 24h
      )
      if (!res.ok) continue
      const data = await res.json()

      // Skip disambiguation pages
      if (data.type === 'disambiguation') continue

      return {
        title: data.title,
        extract: data.extract ? data.extract.split('. ').slice(0, 2).join('. ') + '.' : '',
        imageUrl:    data.originalimage?.source ?? null,
        imageThumb:  data.thumbnail?.source ?? null,
        wikiUrl:     data.content_urls?.desktop?.page ?? null,
      }
    } catch {
      continue
    }
  }
  return null
}
