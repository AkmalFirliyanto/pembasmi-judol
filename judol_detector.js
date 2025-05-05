/**
 * JudolDetector - Detector untuk komentar spam judi online
 * Class untuk mendeteksi komentar yang berisi konten terkait judi online
 */
class JudolDetector {
  constructor(patternsFile = null) {
    // Variabel untuk menyimpan komentar yang terdeteksi
    this.namaSitusJudi = new Set();
    this.polaKarakterKhusus = /[^\x00-\x7F\s]+/; // Karakter non-ASCII
    this.polaAngkaDiAkhir = /[A-Za-z]+\d{1,3}\b/; // Pola seperti DEWA88, AERO77, "17" juga
    
    // Pola bracket/emoji yang lebih lengkap
    this.polaBracketEmoji = /【.*?】|✌.*?✌|🚩.*?🚩|❤️.*?❤️|🤍.*?🤍|⭐.*?|☀|☦|⚔|⛓|♋|♈|‼|❕|⚪|⚽|⚧|☎|◼|☂|☑|⛑|⛹|⛓|[\u2600-\u26FF]|[\u2700-\u27BF]/;
    
    // Kata-kata umum dalam komentar judol
    this.kataKunciJudol = [
      'slot', 'gacor', 'jackpot', 'jp', 'maxwin', 'deposit', 'withdraw', 'wd',
      'bonus', 'scatter', 'sensasional', 'sultan', 'bet', 'gampang menang',
      'cuan', 'gacir', 'luar biasa', 'mantap', 'mantul', 'cair', 'bravo', 'top', 'auto',
      'rezeki', 'beruntung', 'mudah', 'paten', 'hasil', 'terbaik', 'sukses', 'selalu rame', 'toto'
    ];
    
    // Nama situs judi yang sering digunakan
    this.namaSitusJudiDasar = [
      "modalhoki88", "dora77", "dewadora", "aero88", "agustoto", "mandalika77", 
      "ambil4d", "hbcmantul", "sgi88", "alexis17", "koislot", "axl777",
      "dewa", "toba787", "dora97", "dora99", "mandali", "modal", "hoki88", 
      "toto", "togel", "pantai4d", "kantong88", "hero77", "star77", 
      "zeus138", "rajacuan", "rajabandot", "vegasgg", "surya168", 
      "emas168", "liga88", "kingdomtoto", "afabola",
      "weton88",
      "𝘼𝙇𝙄𝙓𝙄𝙎17" // Ditambahkan pola mentah sebagai workaround
    ];
    
    // Kata-kata positif yang biasa muncul di komentar normal
    this.kataPositifNormal = [
      'bagus', 'keren', 'menarik', 'informatif', 'suka', 'senang', 'baik', 
      'bermanfaat', 'membantu', 'hebat', 'inspiratif', 'top', 'semangat', 
      'lanjutkan', 'terima kasih', 'terimakasih', 'makasih', 'video', 
      'konten', 'episode', 'channel', 'saluran', 'acara', 'program',
      'subscribe', 'like', 'thumbs up', 'langganan', 'notifikasi', 
      'mantap', 'sukses', 'terbaik', 'semoga', 'mudah-mudahan'
    ];
    
    // Konteks normal untuk kata-kata yang bisa ambigu
    this.konteksNormal = {
      'mantap': ['konten', 'video', 'channel', 'acara', 'penjelasan', 'presentasi'],
      'top': ['video', 'konten', 'channel', 'presenter', 'pembawa acara'],
      'keren': ['video', 'konten', 'channel', 'acara'],
      'terbaik': ['konten', 'video', 'channel', 'acara', 'presenter', 'episode'],
      'bonus': ['episode', 'konten', 'video', 'scene'],
      'cuan': ['ilmu', 'pengetahuan', 'wawasan', 'pembelajaran']
    };
    
    // Menggunakan pola default jika tidak ada file patterns
    this.loadDefaultPatterns();
  }
  
  /**
   * Memuat pola default
   */
  loadDefaultPatterns() {
    // Menambahkan situs judi dari daftar dasar
    this.namaSitusJudiDasar.forEach(site => this.namaSitusJudi.add(site));
    console.log("Memuat pola default");
  }
  
  /**
   * Menormalkan teks dengan fokus pada pemetaan karakter mirip ASCII 
   * dan mempertahankan beberapa simbol penting untuk deteksi pola.
   * @param {string} text - Teks yang akan dinormalkan
   * @return {{originalPreservedSymbols: string, normalizedAscii: string}} 
   *         Objek berisi teks asli dengan simbol penting dipertahankan, 
   *         dan teks yang dinormalisasi penuh ke ASCII lowercase.
   */
  _normalizeText(text) {
    if (!text) return { originalPreservedSymbols: '', normalizedAscii: '' };

    let baseNormalized = text.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // Hapus combining marks (termasuk underline/overline)

    const unicodeMap = {
      // Fullwidth ASCII variants ...
      '！': '!', '"': '"', '＃': '#', '＄': '$', '％': '%', '＆': '&', '＇': "'", '（': '(', '）': ')', '＊': '*', '＋': '+', '，': ',', '－': '-', '．': '.', '／': '/',
      '０': '0', '１': '1', '２': '2', '３': '3', '４': '4', '５': '5', '６': '6', '７': '7', '８': '8', '９': '9',
      '：': ':', '；': ';', '＜': '<', '＝': '=', '＞': '>', '？': '?', '＠': '@',
      'Ａ': 'A', 'Ｂ': 'B', 'Ｃ': 'C', 'Ｄ': 'D', 'Ｅ': 'E', 'Ｆ': 'F', 'Ｇ': 'G', 'Ｈ': 'H', 'Ｉ': 'I', 'Ｊ': 'J', 'Ｋ': 'K', 'Ｌ': 'L', 'Ｍ': 'M', 'Ｎ': 'N', 'Ｏ': 'O', 'Ｐ': 'P', 'Ｑ': 'Q', 'Ｒ': 'R', 'Ｓ': 'S', 'Ｔ': 'T', 'Ｕ': 'U', 'Ｖ': 'V', 'Ｗ': 'W', 'Ｘ': 'X', 'Ｙ': 'Y', 'Ｚ': 'Z',
      '［': '[', '＼': '\\', '］': ']', '＾': '^', '＿': '_', '｀': '`',
      'ａ': 'a', 'ｂ': 'b', 'ｃ': 'c', 'ｄ': 'd', 'ｅ': 'e', 'ｆ': 'f', 'ｇ': 'g', 'ｈ': 'h', 'ｉ': 'i', 'ｊ': 'j', 'ｋ': 'k', 'ｌ': 'l', 'ｍ': 'm', 'ｎ': 'n', 'ｏ': 'o', 'ｐ': 'p', 'ｑ': 'q', 'ｒ': 'r', 'ｓ': 's', 'ｔ': 't', 'ｕ': 'u', 'ｖ': 'v', 'ｗ': 'w', 'ｘ': 'x', 'ｙ': 'y', 'ｚ': 'z',
      '｛': '{', '｜': '|', '｝': '}', '～': '~',
      // Mathematical Alphanumeric Symbols ...
      '𝐀': 'A', '𝐁': 'B', '𝐂': 'C', '𝐃': 'D', '𝐄': 'E', '𝐅': 'F', '𝐆': 'G', '𝐇': 'H', '𝐈': 'I', '𝐉': 'J', '𝐊': 'K', '𝐋': 'L', '𝐌': 'M', '𝐍': 'N', '𝐎': 'O', '𝐏': 'P', '𝐐': 'Q', '𝐑': 'R', '𝐒': 'S', '𝐓': 'T', '𝐔': 'U', '𝐕': 'V', '𝐖': 'W', '𝐗': 'X', '𝐘': 'Y', '𝐙': 'Z',
      '𝐚': 'a', '𝐛': 'b', '𝐜': 'c', '𝐝': 'd', '𝐞': 'e', '𝐟': 'f', '𝐠': 'g', '𝐡': 'h', '𝐢': 'i', '𝐣': 'j', '𝐤': 'k', '𝐥': 'l', '𝐦': 'm', '𝐧': 'n', '𝐨': 'o', '𝐩': 'p', '𝐪': 'q', '𝐫': 'r', '𝐬': 's', '𝐭': 't', '𝐮': 'u', '𝐯': 'v', '𝐰': 'w', '𝐱': 'x', '𝐲': 'y', '𝐳': 'z',
      '𝟎': '0', '𝟏': '1', '𝟐': '2', '𝟑': '3', '𝟒': '4', '𝟓': '5', '𝟔': '6', '𝟕': '7', '𝟖': '8', '𝟗': '9',
      '𝐴': 'A', '𝐵': 'B', '𝐶': 'C', '𝐷': 'D', '𝐸': 'E', '𝐹': 'F', '𝐺': 'G', '𝐻': 'H', '𝐼': 'I', '𝐽': 'J', '𝐾': 'K', '𝐿': 'L', '𝑀': 'M', '𝑁': 'N', '𝑂': 'O', '𝑃': 'P', '𝑄': 'Q', '𝑅': 'R', '𝑆': 'S', '𝑇': 'T', '𝑈': 'U', '𝑉': 'V', '𝑊': 'W', '𝑋': 'X', '𝑌': 'Y', '𝑍': 'Z',
      '𝑎': 'a', '𝑏': 'b', '𝑐': 'c', '𝑑': 'd', '𝑒': 'e', '𝑓': 'f', '𝑔': 'g', 'ℎ': 'h', '𝑖': 'i', '𝑗': 'j', '𝑘': 'k', '𝑙': 'l', '𝑚': 'm', '𝑛': 'n', '𝑜': 'o', '𝑝': 'p', '𝑞': 'q', '𝑟': 'r', '𝑠': 's', '𝑡': 't', '𝑢': 'u', '𝑣': 'v', '𝑤': 'w', '𝑥': 'x', '𝑦': 'y', '𝑧': 'z',
      '𝑶': 'O', '𝑹': 'R', '𝑨': 'A', '𝑬': 'E', '𝑮': 'G', '𝑯': 'H', '𝑲': 'K', '𝑳': 'L', '𝑰': 'I', '𝑵': 'N', '𝑺': 'S', '𝑼': 'U', '𝒀': 'Y', '𝒁': 'Z',
      '𝒐': 'o', '𝒓': 'r', '𝒂': 'a', '𝒆': 'e', '𝒈': 'g', '𝒉': 'h', '𝒌': 'k', '𝒍': 'l', '𝒊': 'i', '𝒏': 'n', '𝒔': 's', '𝒖': 'u', '𝒚': 'y', '𝒛': 'z',
      '𝟽': '7', '𝟴': '8', '𝟿': '9', '𝟼': '6', '𝟻': '5', '𝟺': '4', '𝟹': '3', '𝟸': '2', '𝟷': '1', '𝟶': '0', // Math digits
      // Circled letters ...
      'Ⓐ': 'A', 'Ⓑ': 'B', 'Ⓒ': 'C', 'Ⓓ': 'D', 'Ⓔ': 'E', 'Ⓕ': 'F', 'Ⓖ': 'G', 'Ⓗ': 'H', 'Ⓘ': 'I', 'Ⓙ': 'J', 'Ⓚ': 'K', 'Ⓛ': 'L', 'Ⓜ': 'M', 'Ⓝ': 'N', 'Ⓞ': 'O', 'Ⓟ': 'P', 'Ⓠ': 'Q', 'Ⓡ': 'R', 'Ⓢ': 'S', 'Ⓣ': 'T', 'Ⓤ': 'U', 'Ⓥ': 'V', 'Ⓦ': 'W', 'Ⓧ': 'X', 'Ⓨ': 'Y', 'Ⓩ': 'Z',
      'ⓐ': 'a', 'ⓑ': 'b', 'ⓒ': 'c', 'ⓓ': 'd', 'ⓔ': 'e', 'ⓕ': 'f', 'ⓖ': 'g', 'ⓗ': 'h', 'ⓘ': 'i', 'ⓙ': 'j', 'ⓚ': 'k', 'ⓛ': 'l', 'ⓜ': 'm', 'ⓝ': 'n', 'ⓞ': 'o', 'ⓟ': 'p', 'ⓠ': 'q', 'ⓡ': 'r', 'ⓢ': 's', 'ⓣ': 't', 'ⓤ': 'u', 'ⓥ': 'v', 'ⓦ': 'w', 'ⓧ': 'x', 'ⓨ': 'y', 'ⓩ': 'z',
      '①': '1', '②': '2', '③': '3', '④': '4', '⑤': '5', '⑥': '6', '⑦': '7', '⑧': '8', '⑨': '9', '⑩': '10',
      // Other common substitutions ...
      'Λ': 'A', 'Ε': 'E', 'Ι': 'I', 'Ο': 'O', 'Ρ': 'P', 'Τ': 'T', 'Υ': 'Y', 'Χ': 'X',
      'А': 'A', 'В': 'B', 'Е': 'E', 'Н': 'H', 'К': 'K', 'М': 'M', 'О': 'O', 'Р': 'P', 'С': 'C', 'Т': 'T', 'Х': 'X',
      'а': 'a', 'в': 'b', 'е': 'e', 'к': 'k', 'м': 'm', 'н': 'h', 'о': 'o', 'р': 'p', 'с': 'c', 'т': 't', 'х': 'x', 'у': 'y', 'і': 'i', 'ј': 'j', 'ѕ': 's',
      '–': '-', '—': '-', '‘': "'", '’': "'", '‚': ',', '“': '"', '”': '"', '„': '"', '…': '...'
    };

    let normalizedAscii = '';
    for (const char of baseNormalized) {
      normalizedAscii += unicodeMap[char] !== undefined ? unicodeMap[char] : char;
    }
    normalizedAscii = normalizedAscii.replace(/[^\w\s\d.,!?-]/g, '').toLowerCase(); // Ke lowercase setelah mapping

    // Versi originalPreservedSymbols: pertahankan simbol visual penting
    let originalPreservedSymbols = text.normalize("NFC")
                                       .replace(/[\u0300-\u036f]/g, "")
                                       .replace(/[\x00-\x1F\x7F]/g, "");

    return {
      originalPreservedSymbols: originalPreservedSymbols,
      normalizedAscii: normalizedAscii
    };
  }
  
  /**
   * Memeriksa apakah komentar kemungkinan besar adalah komentar positif normal
   * @param {string} cleanText - Teks yang sudah dibersihkan dan dinormalisasi
   * @return {boolean} - True jika komentar kemungkinan besar adalah komentar normal
   */
  _isNormalPositiveComment(cleanText) {
    // Hitung kata positif normal dalam teks
    let positiveCount = 0;
    for (const word of this.kataPositifNormal) {
      if (cleanText.includes(word)) {
        positiveCount++;
      }
    }
    
    // Periksa apakah ada pasangan kata yang biasanya muncul dalam konteks normal
    let normalContextPairs = 0;
    for (const [ambiguWord, contextWords] of Object.entries(this.konteksNormal)) {
      if (cleanText.includes(ambiguWord)) {
        for (const context of contextWords) {
          if (cleanText.includes(context)) {
            normalContextPairs++;
            break;
          }
        }
      }
    }
    
    // Jika ada beberapa kata positif dan tidak ada nama situs judi
    if (positiveCount >= 2 && normalContextPairs > 0) {
      // Pastikan tidak ada nama situs judi di teks
      const hasSiteJudi = Array.from(this.namaSitusJudi).some(site => cleanText.includes(site));
      if (!hasSiteJudi) {
        return true;
      }
    }
    
    // Jika komentar mengandung banyak kata positif normal (minimal 3)
    if (positiveCount >= 3) {
      // Dan tidak mengandung nama situs judi
      const hasSiteJudi = Array.from(this.namaSitusJudi).some(site => cleanText.includes(site));
      if (!hasSiteJudi) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Memeriksa konteks kata kunci untuk mengurangi false positive
   * @param {string} text - Teks bersih yang sudah dinormalisasi
   * @param {string} keyword - Kata kunci yang ditemukan
   * @return {boolean} - True jika konteks menunjukkan judol, False jika tidak
   */
  _checkKeywordContext(text, keyword) {
    // Kata kunci umum yang bisa jadi false positive jika berdiri sendiri
    const commonKeywords = ['bonus', 'mantap', 'mantul', 'luar biasa', 'cuan', 'top', 'terbaik'];
    
    // Jika keyword adalah kata umum yang bisa jadi false positive
    if (commonKeywords.includes(keyword.toLowerCase())) {
      // Cek apakah kata kunci ini berdekatan dengan kata yang mencurigakan lainnya
      const situsArray = Array.from(this.namaSitusJudi);
      
      for (const site of situsArray) {
        // Jika kata kunci berada dalam jarak dekat dengan nama situs
        if (text.includes(site)) {
          // Hitung jarak kata
          const words = text.split(/\s+/);
          try {
            const siteIdx = words.findIndex(w => w.includes(site));
            const keywordIdx = words.findIndex(w => w.includes(keyword));
            
            if (siteIdx !== -1 && keywordIdx !== -1) {
              const distance = Math.abs(siteIdx - keywordIdx);
              
              // Jika jarak kurang dari 5 kata, kemungkinan besar judol
              if (distance < 5) {
                return true;
              }
            }
          } catch (error) {
            // Error handling jika ada masalah dengan pencarian indeks
          }
        }
      }
      
      // Cek apakah kata kunci ini ada dalam konteks normal
      if (this.konteksNormal[keyword.toLowerCase()]) {
        for (const contextWord of this.konteksNormal[keyword.toLowerCase()]) {
          if (text.includes(contextWord)) {
            return false;  // Kemungkinan besar bukan judol
          }
        }
      }
      
      // Periksa konteks sekitar kata-kata umum
      // Jika diikuti dengan kata-kata positif umum, mungkin bukan judol
      for (const posWord of this.kataPositifNormal) {
        if (posWord !== keyword && text.includes(posWord)) {
          const words = text.split(/\s+/);
          try {
            const posIdx = words.findIndex(w => w.includes(posWord));
            const keywordIdx = words.findIndex(w => w.includes(keyword));
            
            if (posIdx !== -1 && keywordIdx !== -1) {
              const distance = Math.abs(posIdx - keywordIdx);
              
              if (distance <= 3) {  // Jika dekat dengan kata positif
                return false;  // Kemungkinan bukan judol
              }
            }
          } catch (error) {
            // Error handling
          }
        }
      }
      
      // Periksa panjang teks
      // Jika teks terlalu pendek dan hanya berisi kata kunci umum, mungkin false positive
      if (text.split(/\s+/).length < 5 && !situsArray.some(site => text.includes(site))) {
        return false;
      }
      
      // Jika tidak ada indikator lain, kemungkinan false positive
      return false;
    }
    
    // Untuk kata kunci yang lebih spesifik ke judi, selalu return True
    const specificJudolKeywords = ['slot', 'gacor', 'jackpot', 'jp', 'maxwin', 'deposit', 'withdraw', 'wd', 'scatter', 'rungkad', 'bet', 'toto', 'togel'];
    if (specificJudolKeywords.includes(keyword.toLowerCase())) {
      return true;
    }
    
    // Untuk kata kunci lain yang tidak terlalu spesifik, periksa lebih jauh
    // Jika tidak ada nama situs judi, mungkin bukan judol
    const situsArray = Array.from(this.namaSitusJudi);
    if (!situsArray.some(site => text.includes(site))) {
      // Jika ada banyak kata positif normal
      let posCount = 0;
      for (const word of this.kataPositifNormal) {
        if (text.includes(word)) {
          posCount++;
        }
      }
      
      if (posCount >= 2) {
        return false;
      }
    }
    
    // Default jika tidak ada kondisi khusus
    return true;
  }
  
  /**
   * Mendeteksi apakah teks mengandung spam judi online
   * @param {string} text - Teks komentar yang akan diperiksa
   * @return {Object} - Objek dengan informasi deteksi: {is_judol, confidence, reasons}
   */
  detectJudolComment(text) {
    if (!text || text.trim().length < 5) {
      return { is_judol: false, confidence: 0.0, reasons: [] };
    }

    const { originalPreservedSymbols, normalizedAscii } = this._normalizeText(text);
    const normalizedNoSpace = normalizedAscii.replace(/\s+/g, '');
    const cleanNormalizedAscii = normalizedAscii.replace(/[^\w\s]/g, '');

    const reasons = [];
    let isStrongJudolIndicator = false; 

    // *** ATURAN HEURISTIK (DIREVISI LAGI): Deteksi Karakter Unik Mirip Huruf/Angka ASCII ***
    let lookAlikeCount = 0;
    const checkedChars = new Set(); // Untuk memastikan keunikan karakter ASLI
    const unicodeMap = this._getUnicodeMap(); // Ambil map sekali

    for (const char of text) {
        const mappedValue = unicodeMap[char];
        // Cek jika karakter ada di map DAN hasil map-nya adalah huruf/angka ASCII
        if (mappedValue !== undefined && /^[a-zA-Z0-9]$/.test(mappedValue)) {
            // Hanya hitung karakter asli yang unik
            if (!checkedChars.has(char)) {
                lookAlikeCount++;
                checkedChars.add(char); 
            }
        }
    }
    
    const lookAlikeThreshold = 3; // Minimal 3 karakter unik mirip huruf/angka
    if (lookAlikeCount >= lookAlikeThreshold) { 
        isStrongJudolIndicator = true;
        // Tambahkan alasan hanya jika belum ada alasan kuat lain
        if (!reasons.some(r => r.includes('Nama situs'))) { // Prioritaskan deteksi nama situs
             reasons.push(`Karakter unik mirip huruf/angka terdeteksi (${lookAlikeCount})`); // Sesuaikan teks alasan
        }
    }
    // *** AKHIR ATURAN HEURISTIK ***

    // Lanjutkan dengan aturan lain
    
    // 1. Cek nama situs judi (versi tanpa spasi) - Paling Prioritas
    let siteDetected = false;
    for (const site of this.namaSitusJudi) {
      if (normalizedNoSpace.includes(site.toLowerCase())) {
        if (!reasons.some(r => r.includes(site))) {
          reasons.push(`Nama situs judi terdeteksi: ${site}`);
          siteDetected = true; // Tandai jika nama situs terdeteksi
        }
      }
    }
    
    // Jika nama situs sudah terdeteksi, confidence sudah tinggi, 
    // tidak perlu lagi menambahkan alasan heuristik karakter unik.
    if (siteDetected && reasons[0].includes('Karakter unik')) {
        reasons.shift(); // Hapus alasan karakter unik jika nama situs ditemukan
        isStrongJudolIndicator = false; // Reset flag jika nama situs yg jadi alasan utama
    }
    // Sebaliknya, jika heuristik aktif tapi nama situs tidak terdeteksi, pastikan alasan heuristik ada.
    else if (isStrongJudolIndicator && !siteDetected && !reasons.some(r => r.includes('Karakter unik'))) {
        reasons.unshift(`Karakter unik mirip huruf/angka terdeteksi (${lookAlikeCount})`); // Tambah di awal
    }

    // Cek konteks normal HANYA jika tidak ada indikator kuat sejauh ini
    if (reasons.length === 0 && this._isNormalPositiveComment(cleanNormalizedAscii)) {
        return { is_judol: false, confidence: 0.0, reasons: ["Terdeteksi sebagai komentar positif normal"] };
    }

    // 2. Cek karakter khusus umum (original text NFD)
    const specialChars = text.normalize("NFD").match(this.polaKarakterKhusus) || [];
    if (specialChars.length > 3) {
      const specialCharSample = specialChars.slice(0, 10).join('');
        if (!reasons.some(r => r.includes('Karakter khusus terdeteksi'))) {
           reasons.push(`Karakter khusus terdeteksi: ${specialCharSample}`);
        }
    }

    // 3. Cek pola bracket/emoji (versi preserved symbols)
    const bracketMatches = originalPreservedSymbols.match(this.polaBracketEmoji) || [];
    if (bracketMatches.length > 0) {
        // Tambahkan emoji umum yang aman
        const emojiAman = ['🎉', '👍', '❤️', '🙏', '😊', '🔥', '💪', '👏', '✨', '😄', '😂', '😭', '😋', '🤔', '👉', '✅', '❌', '💯', '➡️'];
        const suspiciousBrackets = bracketMatches.filter(b => 
          !emojiAman.some(safe => b.includes(safe))
        );
        if (suspiciousBrackets.length > 0) {
             if (!reasons.some(r => r.includes('bracket/emoji'))) {
                  reasons.push(`Pola bracket/emoji mencurigakan: ${suspiciousBrackets[0]}`);
             }
        }
    }
    // 5. Cek pola angka spesifik (versi tanpa spasi)
    if (/\b(88|77|99|4d|138|168|17)\b/.test(normalizedNoSpace)) {
       if (!reasons.some(r => r.includes('Pola angka judi') || siteDetected) ){
           reasons.push(`Pola angka judi terdeteksi dalam teks`);
       }
    }

    // 6. Cek kata kunci (versi ASCII normal)
    for (const keyword of this.kataKunciJudol) {
      // Gunakan regex dengan word boundaries () untuk keyword tertentu seperti 'bet'
      const keywordRegex = keyword.toLowerCase() === 'bet' ? new RegExp(`\b${keyword}\b`, 'i') : new RegExp(keyword, 'i');
      
      if (keywordRegex.test(normalizedAscii)) { // Gunakan test() untuk regex
        if (this._checkKeywordContext(cleanNormalizedAscii, keyword)) {
            if (!reasons.some(r => r.includes(keyword))) {
                 reasons.push(`Kata kunci judi terdeteksi: ${keyword}`);
            }
        }
      }
    }

    // 7. Periksa format khusus pada teks asli
    if (/\.{3,}/.test(text) && (
      siteDetected || bracketMatches.length > 0 || specialChars.length > 2
    )) {
       if (!reasons.some(r => r.includes('Format'))) {
           reasons.push("Format mencurigakan: banyak titik");
       }
    }
    
    // 8. Deteksi pola dewadora/aero88 (versi tanpa spasi) - Sudah dicakup oleh aturan nama situs
    // const dewaPola = normalizedNoSpace.match(/dew?[ao][d]?[o0]?[r]?[a]/);
    // const aeroPola = normalizedNoSpace.match(/a[e]?[r]?[o0].*?(88)/);
    // (Kode ini bisa dihapus atau dikomentari karena aturan #1 lebih umum)

    // Perhitungan Confidence
    let confidence = 0.0;
    if (reasons.length > 0) {
        // Prioritas: Nama situs terdeteksi -> confidence tinggi
        if (siteDetected) {
            confidence = 0.95;
        } 
        // Prioritas kedua: Heuristik karakter unik
        else if (isStrongJudolIndicator) {
            confidence = 0.90; 
        } 
        // Jika tidak keduanya, hitung berdasarkan jumlah alasan lain
        else {
            confidence = Math.min(1.0, reasons.length * 0.25);
            if (reasons.length >= 3) {
                 confidence = Math.max(confidence, 0.75); 
            }
        }
        
        // Penyesuaian tambahan
        const hasKeyword = reasons.some(r => r.includes("Kata kunci"));
        const hasBracket = reasons.some(r => r.includes("bracket/emoji"));
        const hasSpecial = reasons.some(r => r.includes("Karakter khusus"));

        if (siteDetected && hasKeyword) {
            confidence = Math.max(confidence, 0.98); // Nama situs + kata kunci = sangat yakin
        } else if (isStrongJudolIndicator && hasKeyword) {
            confidence = Math.max(confidence, 0.95); // Karakter unik + kata kunci
        }
        if (hasBracket && (siteDetected || isStrongJudolIndicator || hasKeyword)) {
            confidence = Math.max(confidence, 0.85);
        }
         if (hasSpecial && (hasKeyword || siteDetected || isStrongJudolIndicator)) {
             confidence = Math.max(confidence, 0.80);
         }
        if (reasons.length === 1 && reasons[0].includes("emoji")) {
            confidence = Math.min(confidence, 0.2); 
        }
    }

    // Aturan 4: Cek pola kata diikuti angka (misal part200, level5) - Direvisi
    const wordNumRegex = /\b([a-zA-Z]+)(\d{1,3})\b/g; 
    let match;
    const foundWordNumPatterns = [];
    while ((match = wordNumRegex.exec(normalizedAscii)) !== null) {
        foundWordNumPatterns.push({ full: match[0], prefix: match[1].toLowerCase(), number: match[2] }); // Tambahkan angka yg cocok
    }

    const safePrefixWords = ["part", "level", "episode", "season", "bab", "halaman", "section", "bagian", "tahap", "chap", "eps", "vol"];
    const suspiciousPatterns = foundWordNumPatterns.filter(item => {
        // Abaikan jika prefix aman
        if (safePrefixWords.includes(item.prefix)) {
            return false;
        }
        // Abaikan jika pola terlalu pendek (misal, "no1")
        if (item.full.length < 4) {
            return false;
        }
        // Abaikan jika angka diakhiri HANYA dengan '2' (indikasi informal teman2, main2)
        if (item.number === '2') { 
            return false;
        }
        // Jika tidak diabaikan, anggap mencurigakan
        return true; 
    });

    // Ambil string lengkap dari pola mencurigakan pertama (jika ada)
    if (suspiciousPatterns.length > 0) {
        const firstSuspiciousPatternString = suspiciousPatterns[0].full;
        if (!siteDetected && !reasons.some(r => r.includes(firstSuspiciousPatternString))) { 
            reasons.push(`Pola kata dengan angka: ${firstSuspiciousPatternString}`); 
        }
    }

    return {
      is_judol: reasons.length > 0,
      confidence: confidence,
      reasons: [...new Set(reasons)]
    };
  }
  
  // Helper untuk mendapatkan map, jika didefinisikan di luar constructor
  _getUnicodeMap() {
      // Menggunakan pemetaan komprehensif dari user
       const unicodeMap = {
           // Fullwidth (Existing)
           '！': '!', '"': '"', '＃': '#', '＄': '$', '％': '%', '＆': '&', '＇': "'", '（': '(', '）': ')', '＊': '*', '＋': '+', '，': ',', '－': '-', '．': '.', '／': '/',
           '０': '0', '１': '1', '２': '2', '３': '3', '４': '4', '５': '5', '６': '6', '７': '7', '８': '8', '９': '9',
           '：': ':', '；': ';', '＜': '<', '＝': '=', '＞': '>', '？': '?', '＠': '@',
           'Ａ': 'A', 'Ｂ': 'B', 'Ｃ': 'C', 'Ｄ': 'D', 'Ｅ': 'E', 'Ｆ': 'F', 'Ｇ': 'G', 'Ｈ': 'H', 'Ｉ': 'I', 'Ｊ': 'J', 'Ｋ': 'K', 'Ｌ': 'L', 'Ｍ': 'M', 'Ｎ': 'N', 'Ｏ': 'O', 'Ｐ': 'P', 'Ｑ': 'Q', 'Ｒ': 'R', 'Ｓ': 'S', 'Ｔ': 'T', 'Ｕ': 'U', 'Ｖ': 'V', 'Ｗ': 'W', 'Ｘ': 'X', 'Ｙ': 'Y', 'Ｚ': 'Z',
           '［': '[', '＼': '\\', '］': ']', '＾': '^', '＿': '_', '｀': '`',
           'ａ': 'a', 'ｂ': 'b', 'ｃ': 'c', 'ｄ': 'd', 'ｅ': 'e', 'ｆ': 'f', 'ｇ': 'g', 'ｈ': 'h', 'ｉ': 'i', 'ｊ': 'j', 'ｋ': 'k', 'ｌ': 'l', 'ｍ': 'm', 'ｎ': 'n', 'ｏ': 'o', 'ｐ': 'p', 'ｑ': 'q', 'ｒ': 'r', 'ｓ': 's', 'ｔ': 't', 'ｕ': 'u', 'ｖ': 'v', 'ｗ': 'w', 'ｘ': 'x', 'ｙ': 'y', 'ｚ': 'z',
           '｛': '{', '｜': '|', '｝': '}', '～': '~',
           
           // Mathematical Alphanumeric Symbols (From User)
           // Sans-Serif Bold Italic
           '𝘼': 'A', '𝘽': 'B', '𝘾': 'C', '𝘿': 'D', '𝙀': 'E', '𝙁': 'F', '𝙂': 'G', '𝙃': 'H', '𝙄': 'I', '𝙅': 'J', '𝙆': 'K', '𝙇': 'L', '𝙈': 'M', '𝙉': 'N', '𝙊': 'O', '𝙋': 'P', '𝙌': 'Q', '𝙍': 'R', '𝙎': 'S', '𝙏': 'T', '𝙐': 'U', '𝙑': 'V', '𝙒': 'W', '𝙓': 'X', '𝙔': 'Y', '𝙕': 'Z',
           '𝙖': 'a', '𝙗': 'b', '𝙘': 'c', '𝙙': 'd', '𝙚': 'e', '𝙛': 'f', '𝙜': 'g', '𝙝': 'h', '𝙞': 'i', '𝙟': 'j', '𝙠': 'k', '𝙡': 'l', '𝙢': 'm', '𝙣': 'n', '𝙤': 'o', '𝙥': 'p', '𝙦': 'q', '𝙧': 'r', '𝙨': 's', '𝙩': 't', '𝙪': 'u', '𝙫': 'v', '𝙬': 'w', '𝙭': 'x', '𝙮': 'y', '𝙯': 'z',
           // Bold
           '𝐀': 'A', '𝐁': 'B', '𝐂': 'C', '𝐃': 'D', '𝐄': 'E', '𝐅': 'F', '𝐆': 'G', '𝐇': 'H', '𝐈': 'I', '𝐉': 'J', '𝐊': 'K', '𝐋': 'L', '𝐌': 'M', '𝐍': 'N', '𝐎': 'O', '𝐏': 'P', '𝐐': 'Q', '𝐑': 'R', '𝐒': 'S', '𝐓': 'T', '𝐔': 'U', '𝐕': 'V', '𝐖': 'W', '𝐗': 'X', '𝐘': 'Y', '𝐙': 'Z',
           '𝐚': 'a', '𝐛': 'b', '𝐜': 'c', '𝐝': 'd', '𝐞': 'e', '𝐟': 'f', '𝐠': 'g', '𝐡': 'h', '𝐢': 'i', '𝐣': 'j', '𝐤': 'k', '𝐥': 'l', '𝐦': 'm', '𝐧': 'n', '𝐨': 'o', '𝐩': 'p', '𝐪': 'q', '𝐫': 'r', '𝐬': 's', '𝐭': 't', '𝐮': 'u', '𝐯': 'v', '𝐰': 'w', '𝐱': 'x', '𝐲': 'y', '𝐳': 'z',
           '𝟎': '0', '𝟏': '1', '𝟐': '2', '𝟑': '3', '𝟒': '4', '𝟓': '5', '𝟔': '6', '𝟕': '7', '𝟖': '8', '𝟗': '9',
           // Italic
           '𝐴': 'A', '𝐵': 'B', '𝐶': 'C', '𝐷': 'D', '𝐸': 'E', '𝐹': 'F', '𝐺': 'G', '𝐻': 'H', '𝐼': 'I', '𝐽': 'J', '𝐾': 'K', '𝐿': 'L', '𝑀': 'M', '𝑁': 'N', '𝑂': 'O', '𝑃': 'P', '𝑄': 'Q', '𝑅': 'R', '𝑆': 'S', '𝑇': 'T', '𝑈': 'U', '𝑉': 'V', '𝑊': 'W', '𝑋': 'X', '𝑌': 'Y', '𝑍': 'Z',
           '𝑎': 'a', '𝑏': 'b', '𝑐': 'c', '𝑑': 'd', '𝑒': 'e', '𝑓': 'f', '𝑔': 'g', 'ℎ': 'h', '𝑖': 'i', '𝑗': 'j', '𝑘': 'k', '𝑙': 'l', '𝑚': 'm', '𝑛': 'n', '𝑜': 'o', '𝑝': 'p', '𝑞': 'q', '𝑟': 'r', '𝑠': 's', '𝑡': 't', '𝑢': 'u', '𝑣': 'v', '𝑤': 'w', '𝑥': 'x', '𝑦': 'y', '𝑧': 'z',
           // Bold Italic
           '𝑨': 'A', '𝑩': 'B', '𝑪': 'C', '𝑫': 'D', '𝑬': 'E', '𝑭': 'F', '𝑮': 'G', '𝑯': 'H', '𝑰': 'I', '𝑱': 'J', '𝑲': 'K', '𝑳': 'L', '𝑴': 'M', '𝑵': 'N', '𝑶': 'O', '𝑷': 'P', '𝑸': 'Q', '𝑹': 'R', '𝑺': 'S', '𝑻': 'T', '𝑼': 'U', '𝑽': 'V', '𝑾': 'W', '𝑿': 'X', '𝒀': 'Y', '𝒁': 'Z',
           '𝒂': 'a', '𝒃': 'b', '𝒄': 'c', '𝒅': 'd', '𝒆': 'e', '𝒇': 'f', '𝒈': 'g', '𝒉': 'h', '𝒊': 'i', '𝒋': 'j', '𝒌': 'k', '𝒍': 'l', '𝒎': 'm', '𝒏': 'n', '𝒐': 'o', '𝒑': 'p', '𝒒': 'q', '𝒓': 'r', '𝒔': 's', '𝒕': 't', '𝒖': 'u', '𝒗': 'v', '𝒘': 'w', '𝒙': 'x', '𝒚': 'y', '𝒛': 'z',
           // Sans-Serif Bold
           '𝗔': 'A', '𝗕': 'B', '𝗖': 'C', '𝗗': 'D', '𝗘': 'E', '𝗙': 'F', '𝗚': 'G', '𝗛': 'H', '𝗜': 'I', '𝗝': 'J', '𝗞': 'K', '𝗟': 'L', '𝗠': 'M', '𝗡': 'N', '𝗢': 'O', '𝗣': 'P', '𝗤': 'Q', '𝗥': 'R', '𝗦': 'S', '𝗧': 'T', '𝗨': 'U', '𝗩': 'V', '𝗪': 'W', '𝗫': 'X', '𝗬': 'Y', '𝗭': 'Z',
           '𝗮': 'a', '𝗯': 'b', '𝗰': 'c', '𝗱': 'd', '𝗲': 'e', '𝗳': 'f', '𝗴': 'g', '𝗵': 'h', '𝗶': 'i', '𝗷': 'j', '𝗸': 'k', '𝗹': 'l', '𝗺': 'm', '𝗻': 'n', '𝗼': 'o', '𝗽': 'p', '𝗾': 'q', '𝗿': 'r', '𝘀': 's', '𝘁': 't', '𝘂': 'u', '𝘃': 'v', '𝘄': 'w', '𝘅': 'x', '𝘆': 'y', '𝘇': 'z',
           '𝟬': '0', '𝟭': '1', '𝟮': '2', '𝟯': '3', '𝟰': '4', '𝟱': '5', '𝟲': '6', '𝟳': '7', '𝟴': '8', '𝟵': '9',
           // Sans-Serif Italic
           '𝘈': 'A', '𝘉': 'B', '𝘊': 'C', '𝘋': 'D', '𝘌': 'E', '𝘍': 'F', '𝘎': 'G', '𝘏': 'H', '𝘐': 'I', '𝘑': 'J', '𝘒': 'K', '𝘓': 'L', '𝘔': 'M', '𝘕': 'N', '𝘖': 'O', '𝘗': 'P', '𝘘': 'Q', '𝘙': 'R', '𝘚': 'S', '𝘛': 'T', '𝘜': 'U', '𝘝': 'V', '𝘞': 'W', '𝘟': 'X', '𝘠': 'Y', '𝘡': 'Z',
           '𝘢': 'a', '𝘣': 'b', '𝘤': 'c', '𝘥': 'd', '𝘦': 'e', '𝘧': 'f', '𝘨': 'g', '𝘩': 'h', '𝘪': 'i', '𝘫': 'j', '𝘬': 'k', '𝘭': 'l', '𝘮': 'm', '𝘯': 'n', '𝘰': 'o', '𝘱': 'p', '𝘲': 'q', '𝘳': 'r', '𝘴': 's', '𝘵': 't', '𝘶': 'u', '𝘷': 'v', '𝘸': 'w', '𝘹': 'x', '𝘺': 'y', '𝘻': 'z',
           // Monospace
           '𝙰': 'A', '𝙱': 'B', '𝙲': 'C', '𝙳': 'D', '𝙴': 'E', '𝙵': 'F', '𝙶': 'G', '𝙷': 'H', '𝙸': 'I', '𝙹': 'J', '𝙺': 'K', '𝙻': 'L', '𝙼': 'M', '𝙽': 'N', '𝙾': 'O', '𝙿': 'P', '𝚀': 'Q', '𝚁': 'R', '𝚂': 'S', '𝚃': 'T', '𝚄': 'U', '𝚅': 'V', '𝚆': 'W', '𝚇': 'X', '𝚈': 'Y', '𝚉': 'Z',
           '𝚊': 'a', '𝚋': 'b', '𝚌': 'c', '𝚍': 'd', '𝚎': 'e', '𝚏': 'f', '𝚐': 'g', '𝚑': 'h', '𝚒': 'i', '𝚓': 'j', '𝚔': 'k', '𝚕': 'l', '𝚖': 'm', '𝚗': 'n', '𝚘': 'o', '𝚙': 'p', '𝚚': 'q', '𝚛': 'r', '𝚜': 's', '𝚝': 't', '𝚞': 'u', '𝚟': 'v', '𝚠': 'w', '𝚡': 'x', '𝚢': 'y', '𝚣': 'z',
           // Double-Struck
           '𝔸': 'A', '𝔹': 'B', 'ℂ': 'C', '𝔻': 'D', '𝔼': 'E', '𝔽': 'F', '𝔾': 'G', 'ℍ': 'H', '𝕀': 'I', '𝕁': 'J', '𝕂': 'K', '𝕃': 'L', '𝕄': 'M', 'ℕ': 'N', '𝕆': 'O', 'ℙ': 'P', 'ℚ': 'Q', 'ℝ': 'R', '𝕊': 'S', '𝕋': 'T', '𝕌': 'U', '𝕍': 'V', '𝕎': 'W', '𝕏': 'X', '𝕐': 'Y', 'ℤ': 'Z',
           '𝕒': 'a', '𝕓': 'b', '𝕔': 'c', '𝕕': 'd', '𝕖': 'e', '𝕗': 'f', '𝕘': 'g', '𝕙': 'h', '𝕚': 'i', '𝕛': 'j', '𝕜': 'k', '𝕝': 'l', '𝕞': 'm', '𝕟': 'n', '𝕠': 'o', '𝕡': 'p', '𝕢': 'q', '𝕣': 'r', '𝕤': 's', '𝕥': 't', '𝕦': 'u', '𝕧': 'v', '𝕨': 'w', '𝕩': 'x', '𝕪': 'y', '𝕫': 'z',
           // Script
           '𝒜': 'A', 'ℬ': 'B', '𝒞': 'C', '𝒟': 'D', 'ℰ': 'E', 'ℱ': 'F', '𝒢': 'G', 'ℋ': 'H', 'ℐ': 'I', '𝒥': 'J', '𝒦': 'K', 'ℒ': 'L', 'ℳ': 'M', '𝒩': 'N', '𝒪': 'O', '𝒫': 'P', '𝒬': 'Q', 'ℛ': 'R', '𝒮': 'S', '𝒯': 'T', '𝒰': 'U', '𝒱': 'V', '𝒲': 'W', '𝒳': 'X', '𝒴': 'Y', '𝒵': 'Z',
           '𝒶': 'a', '𝒷': 'b', '𝒸': 'c', '𝒹': 'd', 'ℯ': 'e', '𝒻': 'f', '𝑔': 'g', '𝒽': 'h', '𝒾': 'i', '𝒿': 'j', '𝓀': 'k', '𝓁': 'l', '𝓂': 'm', '𝓃': 'n', '𝑜': 'o', '𝓅': 'p', '𝓆': 'q', '𝓇': 'r', '𝓈': 's', '𝓉': 't', '𝓊': 'u', '𝓋': 'v', '𝓌': 'w', '𝓍': 'x', '𝓎': 'y', '𝓏': 'z',
           // Bold Script
           '𝓐': 'A', '𝓑': 'B', '𝓒': 'C', '𝓓': 'D', '𝓔': 'E', '𝓕': 'F', '𝓖': 'G', '𝓗': 'H', '𝓘': 'I', '𝓙': 'J', '𝓚': 'K', '𝓛': 'L', '𝓜': 'M', '𝓝': 'N', '𝓞': 'O', '𝓟': 'P', '𝓠': 'Q', '𝓡': 'R', '𝓢': 'S', '𝓣': 'T', '𝓤': 'U', '𝓥': 'V', '𝓦': 'W', '𝓧': 'X', '𝓨': 'Y', '𝓩': 'Z',
           '𝓪': 'a', '𝓫': 'b', '𝓬': 'c', '𝓭': 'd', '𝓮': 'e', '𝓯': 'f', '𝓰': 'g', '𝓱': 'h', '𝓲': 'i', '𝓳': 'j', '𝓴': 'k', '𝓵': 'l', '𝓶': 'm', '𝓷': 'n', '𝓸': 'o', '𝓹': 'p', '𝓺': 'q', '𝓻': 'r', '𝓼': 's', '𝓽': 't', '𝓾': 'u', '𝓿': 'v', '𝔀': 'w', '𝔁': 'x', '𝔂': 'y', '𝔃': 'z',
           // Fraktur
           '𝔄': 'A', '𝔅': 'B', 'ℭ': 'C', '𝔇': 'D', '𝔈': 'E', '𝔉': 'F', '𝔊': 'G', 'ℌ': 'H', 'ℑ': 'I', '𝔍': 'J', '𝔎': 'K', '𝔏': 'L', '𝔐': 'M', '𝔑': 'N', '𝔒': 'O', '𝔓': 'P', '𝔔': 'Q', 'ℜ': 'R', '𝔖': 'S', '𝔗': 'T', '𝔘': 'U', '𝔙': 'V', '𝔚': 'W', '𝔛': 'X', '𝔜': 'Y', 'ℨ': 'Z',
           '𝔞': 'a', '𝔟': 'b', '𝔠': 'c', '𝔡': 'd', '𝔢': 'e', '𝔣': 'f', '𝔤': 'g', '𝔥': 'h', '𝔦': 'i', '𝔧': 'j', '𝔨': 'k', '𝔩': 'l', '𝔪': 'm', '𝔫': 'n', '𝔬': 'o', '𝔭': 'p', '𝔮': 'q', '𝔯': 'r', '𝔰': 's', '𝔱': 't', '𝔲': 'u', '𝔳': 'v', '𝔴': 'w', '𝔵': 'x', '𝔶': 'y', '𝔷': 'z',
           // Bold Fraktur
           '𝕬': 'A', '𝕭': 'B', '𝕮': 'C', '𝕯': 'D', '𝕰': 'E', '𝕱': 'F', '𝕲': 'G', '𝕳': 'H', '𝕴': 'I', '𝕵': 'J', '𝕶': 'K', '𝕷': 'L', '𝕸': 'M', '𝕹': 'N', '𝕺': 'O', '𝕻': 'P', '𝕼': 'Q', '𝕽': 'R', '𝕾': 'S', '𝕿': 'T', '𝖀': 'U', '𝖁': 'V', '𝖂': 'W', '𝖃': 'X', '𝖄': 'Y', '𝖅': 'Z',
           '𝖆': 'a', '𝖇': 'b', '𝖈': 'c', '𝖉': 'd', '𝖊': 'e', '𝖋': 'f', '𝖌': 'g', '𝖍': 'h', '𝖎': 'i', '𝖏': 'j', '𝖐': 'k', '𝖑': 'l', '𝖒': 'm', '𝖓': 'n', '𝖔': 'o', '𝖕': 'p', '𝖖': 'q', '𝖗': 'r', '𝖘': 's', '𝖙': 't', '𝖚': 'u', '𝖛': 'v', '𝖜': 'w', '𝖝': 'x', '𝖞': 'y', '𝖟': 'z',
           // Sans-Serif
           '𝖠': 'A', '𝖡': 'B', '𝖢': 'C', '𝖣': 'D', '𝖤': 'E', '𝖥': 'F', '𝖦': 'G', '𝖧': 'H', '𝖨': 'I', '𝖩': 'J', '𝖪': 'K', '𝖫': 'L', '𝖬': 'M', '𝖭': 'N', '𝖮': 'O', '𝖯': 'P', '𝖰': 'Q', '𝖱': 'R', '𝖲': 'S', '𝖳': 'T', '𝖴': 'U', '𝖵': 'V', '𝖶': 'W', '𝖷': 'X', '𝖸': 'Y', '𝖹': 'Z',
           '𝖺': 'a', '𝖻': 'b', '𝖼': 'c', '𝖽': 'd', '𝖾': 'e', '𝖿': 'f', '𝗀': 'g', '𝗁': 'h', '𝗂': 'i', '𝗃': 'j', '𝗄': 'k', '𝗅': 'l', '𝗆': 'm', '𝗇': 'n', '𝗈': 'o', '𝗉': 'p', '𝗊': 'q', '𝗋': 'r', '𝗌': 's', '𝗍': 't', '𝗎': 'u', '𝗏': 'v', '𝗐': 'w', '𝗑': 'x', '𝗒': 'y', '𝗓': 'z',
           // Small Caps (Beberapa mungkin sudah dicover oleh lowercase biasa, tapi untuk kelengkapan)
           'ᴀ': 'A', 'ʙ': 'B', 'ᴄ': 'C', 'ᴅ': 'D', 'ᴇ': 'E', 'ꜰ': 'F', 'ɢ': 'G', 'ʜ': 'H', 'ɪ': 'I', 'ᴊ': 'J', 'ᴋ': 'K', 'ʟ': 'L', 'ᴍ': 'M', 'ɴ': 'N', 'ᴏ': 'O', 'ᴘ': 'P', 'ǫ': 'Q', 'ʀ': 'R', 's': 'S', 'ᴛ': 'T', 'ᴜ': 'U', 'ᴠ': 'V', 'ᴡ': 'W', 'x': 'X', 'ʏ': 'Y', 'ᴢ': 'Z',
           // Circled (Existing)
           'Ⓐ': 'A', 'Ⓑ': 'B', 'Ⓒ': 'C', 'Ⓓ': 'D', 'Ⓔ': 'E', 'Ⓕ': 'F', 'Ⓖ': 'G', 'Ⓗ': 'H', 'Ⓘ': 'I', 'Ⓙ': 'J', 'Ⓚ': 'K', 'Ⓛ': 'L', 'Ⓜ': 'M', 'Ⓝ': 'N', 'Ⓞ': 'O', 'Ⓟ': 'P', 'Ⓠ': 'Q', 'Ⓡ': 'R', 'Ⓢ': 'S', 'Ⓣ': 'T', 'Ⓤ': 'U', 'Ⓥ': 'V', 'Ⓦ': 'W', 'Ⓧ': 'X', 'Ⓨ': 'Y', 'Ⓩ': 'Z',
           'ⓐ': 'a', 'ⓑ': 'b', 'ⓒ': 'c', 'ⓓ': 'd', 'ⓔ': 'e', 'ⓕ': 'f', 'ⓖ': 'g', 'ⓗ': 'h', 'ⓘ': 'i', 'ⓙ': 'j', 'ⓚ': 'k', 'ⓛ': 'l', 'ⓜ': 'm', 'ⓝ': 'n', 'ⓞ': 'o', 'ⓟ': 'p', 'ⓠ': 'q', 'ⓡ': 'r', 'ⓢ': 's', 'ⓣ': 't', 'ⓤ': 'u', 'ⓥ': 'v', 'ⓦ': 'w', 'ⓧ': 'x', 'ⓨ': 'y', 'ⓩ': 'z',
           '①': '1', '②': '2', '③': '3', '④': '4', '⑤': '5', '⑥': '6', '⑦': '7', '⑧': '8', '⑨': '9', '⑩': '10',
           // Regional Indicator Symbols
           '🇦': 'A', '🇧': 'B', '🇨': 'C', '🇩': 'D', '🇪': 'E', '🇫': 'F', '🇬': 'G', '🇭': 'H', '🇮': 'I', '🇯': 'J', '🇰': 'K', '🇱': 'L', '🇲': 'M', '🇳': 'N', '🇴': 'O', '🇵': 'P', '🇶': 'Q', '🇷': 'R', '🇸': 'S', '🇹': 'T', '🇺': 'U', '🇻': 'V', '🇼': 'W', '🇽': 'X', '🇾': 'Y', '🇿': 'Z',
           // Variasi angka (From User)
           '⒈': '1', '⒉': '2', '⒊': '3', '⒋': '4', '⒌': '5', '⒍': '6', '⒎': '7', '⒏': '8', '⒐': '9',
           '①': '1', '②': '2', '③': '3', '④': '4', '⑤': '5', '⑥': '6', '⑦': '7', '⑧': '8', '⑨': '9',
           '𝟙': '1', '𝟚': '2', '𝟛': '3', '𝟜': '4', '𝟝': '5', '𝟞': '6', '𝟟': '7', '𝟠': '8', '𝟡': '9', // Double-struck
           '𝟎': '0', '𝟏': '1', '𝟐': '2', '𝟓': '5', '𝟔': '6', '𝟗': '9', // Bold
           '𝟶': '0', '𝟷': '1', '𝟸': '2', '𝟹': '3', '𝟺': '4', '𝟻': '5', '𝟼': '6', '𝟽': '7', '𝟾': '8', '𝟿': '9', // Sans-serif
           '𝟬': '0', '𝟭': '1', '𝟮': '2', '𝟯': '3', '𝟰': '4', '𝟱': '5', '𝟲': '6', '𝟳': '7', '𝟴': '8', '𝟵': '9', // Sans-serif bold
           // Other common substitutions (Existing)
           'Λ': 'A', 'Ε': 'E', 'Ι': 'I', 'Ο': 'O', 'Ρ': 'P', 'Τ': 'T', 'Υ': 'Y', 'Χ': 'X',
           'А': 'A', 'В': 'B', 'Е': 'E', 'Н': 'H', 'К': 'K', 'М': 'M', 'О': 'O', 'Р': 'P', 'С': 'C', 'Т': 'T', 'Х': 'X',
           'а': 'a', 'в': 'b', 'е': 'e', 'к': 'k', 'м': 'm', 'н': 'h', 'о': 'o', 'р': 'p', 'с': 'c', 'т': 't', 'х': 'x', 'у': 'y', 'і': 'i', 'ј': 'j', 'ѕ': 's',
           '–': '-', '—': '-', '‘': "'", '’': "'", '‚': ',', '“': '"', '”': '"', '„': '"', '…': '...',
           // Tambahkan emoji aman yang baru
           '🙏🏻': '🙏', // Tangan berdoa dengan varian warna kulit (contoh, bisa lebih banyak)
           '👆🏻': '👆', // Telunjuk ke atas dengan varian (contoh)
           '👆🏼': '👆',
           '👆🏽': '👆',
           '👆🏾': '👆',
           '👆🏿': '👆'
       }; // Akhir unicodeMap
      return unicodeMap;
  }
}

// Export untuk lingkungan Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = JudolDetector;
}

// Contoh penggunaan
function testJudolDetector() {
  const detector = new JudolDetector();
  
  const testComments = [
    "Video ini sangat menarik dan informatif!",
    "Ayo gabung di 𝐷𝐎𝐑𝘈𝟽𝟽 untuk pengalaman terbaik!",
    "Sumpah penasaran banget kenapa pada bahas 【✌ ☎◼⚪✌㊗⚧17 ✌】 di kolom komentar ?.",
    "Nggak pernah kecewa sama hasil di 𝘿𝐸W𝐷О𝐑А, semuanya luar biasa!",
    "Main slot di AERO88 hari ini, JP MAXWIN sampe 200jt! Gacor parah bro.",
    "Situs ALEXIS17 emang paling mantul, scatter muncul terus!",
    "dari semua situs, cuma SGI88 yang beneran bayar, sisanya scam semua."
  ];
  
  for (const comment of testComments) {
    const result = detector.detectJudolComment(comment);
    console.log(`Komentar: ${comment}`);
    console.log(`Terdeteksi sebagai judol: ${result.is_judol}`);
    if (result.is_judol) {
      console.log(`Confidence: ${result.confidence.toFixed(2)}`);
      for (const reason of result.reasons) {
        console.log(`- ${reason}`);
      }
    }
    console.log("---");
  }
}

// Jalankan tes jika berada di lingkungan browser
if (typeof window !== 'undefined') {
  // Jalankan test setelah halaman dimuat
  window.addEventListener('DOMContentLoaded', testJudolDetector);
} 