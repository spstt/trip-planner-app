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
  // Thai → English city name map
  const THAI_MAP: Record<string, string> = {
    // Japan
    'โตเกียว': 'Tokyo', 'โอซาก้า': 'Osaka', 'โอซากา': 'Osaka',
    'เกียวโต': 'Kyoto', 'ฮอกไกโด': 'Hokkaido', 'ซัปโปโร': 'Sapporo',
    'นาโกย่า': 'Nagoya', 'ฟุกุโอกะ': 'Fukuoka', 'นารา': 'Nara',
    'โยโกฮาม่า': 'Yokohama', 'ฮิโรชิม่า': 'Hiroshima', 'โอกินาว่า': 'Okinawa',
    // Korea
    'โซล': 'Seoul', 'ปูซาน': 'Busan', 'บูซาน': 'Busan',
    'อินชอน': 'Incheon', 'แทกู': 'Daegu', 'แทจอน': 'Daejeon',
    'เชจู': 'Jeju', 'กยองจู': 'Gyeongju', 'จอนจู': 'Jeonju',
    // China
    'ปักกิ่ง': 'Beijing', 'เซี่ยงไฮ้': 'Shanghai', 'ฮ่องกง': 'Hong_Kong',
    'กวางโจว': 'Guangzhou', 'เฉิงตู': 'Chengdu', 'ซีอาน': 'Xi\'an',
    'หางโจว': 'Hangzhou', 'ซูโจว': 'Suzhou', 'กุ้ยหลิน': 'Guilin',
    'มาเก๊า': 'Macau',
    // Southeast Asia
    'สิงคโปร์': 'Singapore', 'กัวลาลัมเปอร์': 'Kuala_Lumpur',
    'จาการ์ตา': 'Jakarta', 'บาหลี': 'Bali', 'มะนิลา': 'Manila',
    'ฮานอย': 'Hanoi', 'โฮจิมินห์': 'Ho_Chi_Minh_City',
    'เสียมเรียบ': 'Siem_Reap', 'พนมเปญ': 'Phnom_Penh',
    'ย่างกุ้ง': 'Yangon', 'บาหยกอก': 'Bangkok',
    'เวียงจันทน์': 'Vientiane', 'หลวงพระบาง': 'Luang_Prabang',
    // Thailand
    'กรุงเทพ': 'Bangkok', 'กรุงเทพฯ': 'Bangkok', 'กทม': 'Bangkok',
    'เชียงใหม่': 'Chiang_Mai', 'ภูเก็ต': 'Phuket',
    'พัทยา': 'Pattaya', 'หัวหิน': 'Hua_Hin', 'เกาะสมุย': 'Ko_Samui',
    'กระบี่': 'Krabi', 'เกาะพีพี': 'Ko_Phi_Phi', 'เกาะช้าง': 'Ko_Chang',
    'เชียงราย': 'Chiang_Rai', 'อยุธยา': 'Ayutthaya', 'สุโขทัย': 'Sukhothai',
    // Europe
    'ปารีส': 'Paris', 'ลอนดอน': 'London', 'โรม': 'Rome',
    'บาร์เซโลนา': 'Barcelona', 'มาดริด': 'Madrid', 'อัมสเตอร์ดัม': 'Amsterdam',
    'เบอร์ลิน': 'Berlin', 'ปราก': 'Prague', 'เวียนนา': 'Vienna',
    'บูดาเปสต์': 'Budapest', 'วอร์ซอ': 'Warsaw', 'บรัสเซลส์': 'Brussels',
    'เวนิส': 'Venice', 'ฟลอเรนซ์': 'Florence', 'มิลาน': 'Milan',
    'ซูริค': 'Zurich', 'เจนีวา': 'Geneva', 'ลิสบอน': 'Lisbon',
    'อิสตันบูล': 'Istanbul', 'อาเธนส์': 'Athens',
    // Americas
    'นิวยอร์ก': 'New_York_City', 'ลอสแองเจลิส': 'Los_Angeles',
    'ซานฟรานซิสโก': 'San_Francisco', 'ชิคาโก': 'Chicago',
    'ลาสเวกัส': 'Las_Vegas', 'ไมอามี': 'Miami', 'บอสตัน': 'Boston',
    'โตรอนโต': 'Toronto', 'แวนคูเวอร์': 'Vancouver',
    'เม็กซิโกซิตี้': 'Mexico_City', 'บัวโนสไอเรส': 'Buenos_Aires',
    // Middle East & Others
    'ดูไบ': 'Dubai', 'อาบูดาบี': 'Abu_Dhabi', 'โดฮา': 'Doha',
    'ซิดนีย์': 'Sydney', 'เมลเบิร์น': 'Melbourne', 'โอ๊คแลนด์': 'Auckland',
    'มุมไบ': 'Mumbai', 'นิวเดลี': 'New_Delhi',
  }

  const isThai = /[฀-๿]/.test(city)
  const mapped = THAI_MAP[city]

  // Build search list: [lang, name]
  const candidates: Array<[string, string]> = []

  if (mapped) {
    candidates.push(['en', mapped])
  }
  if (isThai) {
    // Try Thai Wikipedia first for Thai city names
    candidates.push(['th', city])
    candidates.push(['th', city.replace(/\s+/g, '_')])
  }
  // Always try English as fallback
  candidates.push(['en', city])
  candidates.push(['en', city.replace(/\s+/g, '_')])

  for (const [lang, name] of candidates) {
    try {
      const res = await fetch(
        `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name)}`,
        { next: { revalidate: 86400 } }
      )
      if (!res.ok) continue
      const data = await res.json()
      if (data.type === 'disambiguation') continue

      return {
        title: data.title,
        extract: data.extract ? data.extract.split('. ').slice(0, 2).join('. ') + '.' : '',
        imageUrl:   data.originalimage?.source ?? null,
        imageThumb: data.thumbnail?.source ?? null,
        wikiUrl:    data.content_urls?.desktop?.page ?? null,
      }
    } catch {
      continue
    }
  }
  return null
}
