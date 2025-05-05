// Ketika ekstensi diinstal pertama kali
chrome.runtime.onInstalled.addListener(() => {
  // Tentukan nilai default
  chrome.storage.local.set({
    autoRemove: false,
    detectedCount: 0,
    removedCount: 0,
    judolPatterns: extractJudolPatterns(),
    whitelistPatterns: extractWhitelistPatterns()
  });
});

// Ekstrak pola Judol dari template
function extractJudolPatterns() {
  // Daftar pola nama judi online yang dideteksi dari template
  return [
    // Template dari template_judol.txt
    "𝗠𝗢𝗗𝗔𝗟𝗛𝗢𝗞𝗜𝟴𝟴",
    "𝘿𝘖𝘙𝐴𝟩𝟩", 
    "𝘋ОR𝘼𝟩𝟳",
    "𝐷𝙊𝑅𝐴𝟳𝟳",
    "𝐃E𝙒𝐀D𝑂𝐑𝘈",
    "𝘋𝐄𝘞A𝘋𝙊𝙍А",
    "𝘈Е𝐑𝐎𝟾𝟾",
    "𝐴𝘎𝙐𝙎TО𝙏𝐎",
    "𝐷𝐎𝐑𝘈𝟽𝟽",
    "𝐴𝐄𝐑𝑂𝟪𝟾",
    "𝘿𝐸W𝐴𝐷О𝐑А",
    "𝗔𝗠𝗕𝗜𝗟𝟰𝗗",
    "𝐌𝐀𝐍𝘿𝘼𝙇𝙄𝙆𝘼𝟕𝟕",
    "𝙃𝘽𝘾𝙈𝘼𝙉𝙏𝙐𝙇",
    "𝐭𝐨𝐛𝐚𝟓𝟖𝟓",
    "𝐒𝐆𝐈𝟖𝟖",
    "A̳̳L̳̳E̳̳X̳̳I̳̳S̳̳1̳̳7̳",
    "【✌ ⛹⚪➡⚔⛓☦17 ✌】",
    "【✌ ☎◼⚪✌㊗⚧17 ✌】",
    "【✌ ♋♈‼✝⚽⛓17 ✌】",
    "✌ ♟⛑⛑❕17 ✌",
    "⭐☕⚽❕⛎▶⚡️17",
    "⭐⚽‼⛹☂☑⛑17",
    "𝘈 𝘌 𝐑 𝙊 𝟾 𝟴",
    
    // Pola-pola baru dari permintaan
    "А 𝐗 𝘓 7 𝟩 𝟳",
    "𝐀𝐅𝐀𝐁𝐎𝐋𝐀",
    "⭐𝘼𝙇𝙀𝙓𝙄𝙎17",
    "M̠A̠̠N̠̠D̠A̠̠L̠̠I̠̠K̠A̠̠7̠̠7̠",
    "𝗞 𝗢 𝗜 𝗦 𝗟 𝗢 𝗧",
    "【✌ ↔❎♌⁉❌♟17 ✌】",
    "🤍𝙃𝘽𝘾𝙈𝘼𝙉𝙏𝙐𝙇🤍",
    
    // Pola tambahan Alexis
    "⭐𝘼𝙇𝙀𝙓𝙄𝙎17",
    "🔥ＡＬＥＸＩＳ１７🔥",
    "❤A L E X I S 1 7❤",
    "ΛLEXIS17",
    "☯AL𝐄𝗫𝗜𝗦𝟏𝟕☯",
    "⭐A L E X I S 1 7⭐",
    
    // Variasi tambahan yang umum
    "AER0",
    "D0RA",
    "SG1",
    "ALEXIS",
    "HOKI",
    "M0DAL",
    "T0BA",
    "DEWADORA",
    "B0LA",
    "TOG3L",
    "SLOTT",
    "CASINO",
    "JUDI",
    "BET",
    "POKER",
    "DOMINO",
    "BANDAR",
    
    // Pola khusus untuk nama-nama situs dengan angka
    "77", "88", "99", "123", "777", "888", "999", "138", "303", "178", "338", 
    "4d", "5d", "pelita365", "megawin77", "hokilucky", "warung138",
    "arena77", "warung777", "koko303", "zeus138", "royal77", "mahjong",
    "jaya88", "rtp", "live", "resmi", "x500", "mantul", "gacor", "Alexis"
  ];
}

// Ekstrak pola whitelist (kata-kata yang mungkin false positive)
function extractWhitelistPatterns() {
  return [
    // Kata-kata umum yang mungkin terkait dengan konten non-judi
    "konten", "content", "bagus", "keren", "mantap", "suka", "like", 
    "subscribe", "share", "komen", "comment", "video", "duet", "tiktok", 
    "youtube", "instagram", "facebook", "twitter", "follow",
    
    // Kata-kata yang mungkin bermakna ganda
    "modal usaha", "modal bisnis", "modal dagang", "slot waktu", 
    "slot parkir", "daftar hadir", "daftar tamu", "daftar menu",
    "bett*r", "tob*", "win", "raja", "ratu", "dewa", "dewi",
    
    // Nama-nama yang mungkin bentrok dengan pola judol
    "Alexander", "Alexandra", "Alexei", "Alexia", "Alexis Sanchez",
    "Dora the Explorer", "Doraemon", "Toba Lake", "Danau Toba",
    "Radio", "Editor", "Mode", "Model", "Modern", "Modis",

    // Tambahan pola untuk mencegah false positive dari whitelist.txt
    "replay join membership", "kurdog", "jrogg", "channel", "next", "bikin bareng",
    "emg udh rp", "nm server", "mungkin maksud", "anime ini", "soalnya", "pew pew pew",
    "bukti", "Next ayunda", "1 generasi", "Aduh", "iya", "Ada debat", "emoji", "zetaa",
    "bentar", "gen 3", "PLISSS", "CLIPPER", "PART", "PARA", "BUAT", "RAMBUTNYA",
    
    // Tambahan pola timestamp yang sering ada di komentar YouTube
    ":", // untuk deteksi timestamp (hh:mm)
    
    // Pola lainnya yang sering ada di komentar YouTube asli
    "😂", "🥰", "wkwk", "mantapp", "bagus", "keren", "review", "anime", "netflix",
    "season", "episode", "part", "reaksi", "lanjut", "video", "youtube",
    "reaction", "review", "komentar", "komen", "seru", "gemes", "lucu", "ngakak"
  ];
}

// Mendengarkan permintaan dari popup atau content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getJudolPatterns") {
    chrome.storage.local.get(['judolPatterns'], (result) => {
      sendResponse({patterns: result.judolPatterns});
    });
    return true; // Untuk async sendResponse
  } else if (request.action === "getWhitelistPatterns") {
    chrome.storage.local.get(['whitelistPatterns'], (result) => {
      sendResponse({patterns: result.whitelistPatterns});
    });
    return true;
  } else if (request.action === "addJudolPattern") {
    // Menambahkan pola baru yang ditemukan oleh pengguna
    chrome.storage.local.get(['judolPatterns'], (result) => {
      const patterns = result.judolPatterns || [];
      if (!patterns.includes(request.pattern)) {
        patterns.push(request.pattern);
        chrome.storage.local.set({judolPatterns: patterns}, () => {
          sendResponse({success: true});
        });
      } else {
        sendResponse({success: false, message: "Pattern already exists"});
      }
    });
    return true;
  } else if (request.action === "addWhitelistPattern") {
    // Menambahkan pola whitelist baru
    chrome.storage.local.get(['whitelistPatterns'], (result) => {
      const patterns = result.whitelistPatterns || [];
      if (!patterns.includes(request.pattern)) {
        patterns.push(request.pattern);
        chrome.storage.local.set({whitelistPatterns: patterns}, () => {
          sendResponse({success: true});
        });
      } else {
        sendResponse({success: false, message: "Pattern already exists"});
      }
    });
    return true;
  }
}); 