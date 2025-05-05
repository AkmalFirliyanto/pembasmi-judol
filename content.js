// Variabel untuk menyimpan komentar yang terdeteksi
let detectedComments = [];
let judolPatterns = [];
let whitelistPatterns = []; // Daftar pola whitelist
let autoRemove = false;
let isScanning = false;
let lastCommentCount = 0;
let isExtensionValid = true; // Flag untuk mengecek apakah ekstensi masih valid

// Inisialisasi JudolDetector
const detector = new JudolDetector(); 

// Dapatkan pola judol, whitelist, dan pengaturan dari storage
chrome.storage.local.get(['judolPatterns', 'whitelistPatterns', 'autoRemove'], function(result) {
  judolPatterns = result.judolPatterns || [];
  whitelistPatterns = result.whitelistPatterns || [];
  autoRemove = result.autoRemove || false;
  
  // Jalankan pemindaian awal jika autoRemove aktif
  if (autoRemove && window.location.href.includes('youtube.com/watch')) {
    setTimeout(() => {
      scanForJudolComments(true);
    }, 3000);
  }
});

// Listener untuk pesan dari popup atau background
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  // Cek apakah ekstensi valid
  try {
    // Periksa validitas ekstensi secara eksplisit
    if (chrome.runtime.id) {
      isExtensionValid = true;
    } else {
      isExtensionValid = false;
      sendResponse({error: "Extension context invalidated"});
      return true;
    }
  } catch (err) {
    console.log("Ekstensi tidak valid saat menerima pesan:", err);
    isExtensionValid = false;
    sendResponse({error: "Extension context invalidated"});
    return true;
  }
  
  try {
    if (request.action === "scan") {
      // Handle pemindaian dengan menangkap kemungkinan error
      scanForJudolComments(false).then(count => {
        try {
          if (isExtensionValid) {
            sendResponse({count: count});
          }
        } catch (err) {
          console.error("Error saat mengirim respons scan:", err);
        }
      }).catch(err => {
        console.error("Error dalam pemindaian:", err);
        try {
          if (isExtensionValid) {
            sendResponse({error: err.message});
          }
        } catch (respErr) {
          console.error("Tidak bisa mengirim respons error:", respErr);
        }
      });
      return true;
    } else if (request.action === "remove") {
      const removePromise = removeJudolComments();
      removePromise.then(count => {
        try {
          sendResponse({count: count});
        } catch (err) {
          console.error("Error saat mengirim respons remove:", err);
        }
      }).catch(err => {
        console.error("Error dalam penghapusan:", err);
        try {
          sendResponse({error: err.message});
        } catch (respErr) {
          console.error("Tidak bisa mengirim respons error:", respErr);
        }
      });
      return true;
    } else if (request.action === "autoRemoveUpdated") {
      autoRemove = request.value;
      console.log("Auto-remove diperbarui:", autoRemove);
      
      if (autoRemove) {
        scanForJudolComments(true).catch(err => {
          console.error("Error dalam pemindaian setelah update autoRemove:", err);
        });
      } else {
        restoreHiddenComments();
      }
      
      try {
        sendResponse({success: true, autoRemove: autoRemove});
      } catch (err) {
        console.error("Error saat mengirim respons autoRemoveUpdated:", err);
      }
      return true;
    } else if (request.action === "markAsFalsePositive") {
      if (request.text) {
        try {
          chrome.runtime.sendMessage({
            action: "addWhitelistPattern", 
            pattern: request.text
          }, function(backendResponse) {
            // Tangani respons dari background script dengan aman
            if (chrome.runtime.lastError) {
              console.error("Error saat menambahkan pattern whitelist:", chrome.runtime.lastError);
              return;
            }
            
            // Refresh pemindaian dengan pola whitelist baru
            setTimeout(() => {
              chrome.storage.local.get(['whitelistPatterns'], function(result) {
                if (chrome.runtime.lastError) {
                  console.error("Error saat mendapatkan whitelistPatterns:", chrome.runtime.lastError);
                  return;
                }
                whitelistPatterns = result.whitelistPatterns || [];
                scanForJudolComments(true).catch(err => {
                  console.error("Error dalam pemindaian setelah update whitelist:", err);
                });
              });
            }, 500);
          });
        } catch (err) {
          console.error("Error saat mengirim pesan addWhitelistPattern:", err);
        }
      }
      try {
        sendResponse({success: true});
      } catch (err) {
        console.error("Error saat mengirim respons markAsFalsePositive:", err);
      }
      return true;
    } else if (request.action === "markAsJudol") {
      if (request.text) {
        try {
          chrome.runtime.sendMessage({
            action: "addJudolPattern", 
            pattern: request.text
          }, function(backendResponse) {
            // Tangani respons dari background script dengan aman
            if (chrome.runtime.lastError) {
              console.error("Error saat menambahkan pattern judol:", chrome.runtime.lastError);
              return;
            }
            
            // Refresh pemindaian dengan pola judol baru
            setTimeout(() => {
              chrome.storage.local.get(['judolPatterns'], function(result) {
                if (chrome.runtime.lastError) {
                  console.error("Error saat mendapatkan judolPatterns:", chrome.runtime.lastError);
                  return;
                }
                judolPatterns = result.judolPatterns || [];
                scanForJudolComments(true).catch(err => {
                  console.error("Error dalam pemindaian setelah update judol patterns:", err);
                });
              });
            }, 500);
          });
        } catch (err) {
          console.error("Error saat mengirim pesan addJudolPattern:", err);
        }
      }
      try {
        sendResponse({success: true});
      } catch (err) {
        console.error("Error saat mengirim respons markAsJudol:", err);
      }
      return true;
    }
  } catch (err) {
    console.error("Error dalam message listener:", err);
    // Tandai ekstensi sebagai tidak valid jika terjadi error
    if (err.message && err.message.includes("Extension context invalidated")) {
      isExtensionValid = false;
    }
    try {
      sendResponse({error: err.message});
    } catch (respErr) {
      console.error("Tidak bisa mengirim respons error:", respErr);
    }
    return true;
  }
});

// Tambahkan pengecekan validitas ekstensi dengan interval reguler
const checkExtensionValidity = () => {
  try {
    if (chrome.runtime.id) {
      isExtensionValid = true;
    } else {
      isExtensionValid = false;
    }
  } catch (err) {
    console.log("Ekstensi tidak valid:", err);
    isExtensionValid = false;
  }
};

// Jalankan pengecekan setiap 5 detik
setInterval(checkExtensionValidity, 5000);

// Tambahkan event listener untuk deteksi page unload
window.addEventListener('beforeunload', function() {
  isExtensionValid = false;
});

// Fungsi untuk memindai komentar judol
async function scanForJudolComments(autoRemoveMode = false) {
  if (!isExtensionValid) return (detectedComments ? detectedComments.length : 0);
  if (isScanning) return (detectedComments ? detectedComments.length : 0);
  isScanning = true;
  
  try {
    console.log("Memulai pemindaian dengan JudolDetector, autoRemove:", autoRemove);
    
    if (!autoRemoveMode) {
      detectedComments = [];
    }
    
    // Cek validitas ekstensi (try-catch block seperti sebelumnya)
    try {
      if (!chrome.runtime.id) throw new Error("Invalid context");
    } catch (err) {
      isExtensionValid = false;
      throw new Error("Extension context invalidated during scan initialization");
    }
    
    const commentSection = await waitForCommentSection();
    
    // Cek validitas lagi (try-catch block seperti sebelumnya)
    try {
      if (!chrome.runtime.id) throw new Error("Invalid context");
    } catch (err) {
      isExtensionValid = false;
      throw new Error("Extension context invalidated after comment section wait");
    }
    
    if (!commentSection) {
      isScanning = false;
      return (detectedComments ? detectedComments.length : 0);
    }

    const commentElements = document.querySelectorAll('ytd-comment-thread-renderer');
    
    // Cek validitas lagi (try-catch block seperti sebelumnya)
    try {
      if (!chrome.runtime.id) throw new Error("Invalid context");
    } catch (err) {
      isExtensionValid = false;
      throw new Error("Extension context invalidated during comment processing");
    }
    
    if (autoRemoveMode && lastCommentCount === commentElements.length && detectedComments && detectedComments.length > 0) {
      isScanning = false;
      return detectedComments.length;
    }
    
    lastCommentCount = commentElements.length;
    console.log("Jumlah komentar ditemukan:", commentElements.length);
    
    commentElements.forEach(comment => {
      if (!isExtensionValid) {
        throw new Error("Extension context invalidated during comment iteration");
      }
      
      if (detectedComments.includes(comment)) {
        if (autoRemove) {
          comment.style.display = 'none';
        }
        return;
      }
      
      const commentContent = comment.querySelector('#content-text');
      if (commentContent) {
        const commentText = commentContent.innerText;
        
        // *** Gunakan JudolDetector ***
        const detectionResult = detector.detectJudolComment(commentText);
        
        if (detectionResult.is_judol) {
          // Hanya tambahkan ke daftar jika belum ada
          if (!detectedComments.includes(comment)) {
            detectedComments.push(comment);
            console.log(`Komentar judol terdeteksi (Conf: ${detectionResult.confidence.toFixed(2)}):`, commentText.slice(0, 50) + "...");
            console.log("Alasan:", detectionResult.reasons.join(', '));
          }
          
          // Tandai komentar yang terdeteksi
          comment.style.border = '2px solid red';
          comment.style.backgroundColor = 'rgba(255, 0, 0, 0.05)';
          
          // Jika autoRemove diaktifkan, sembunyikan komentar
          if (autoRemove) {
            comment.style.display = 'none';
            console.log("Komentar judol dihapus otomatis");
          }
        } else {
           // Opsional: Hapus border jika sebelumnya ditandai tapi sekarang tidak terdeteksi
           if (comment.style.border.includes('red')) {
             comment.style.border = '';
             comment.style.backgroundColor = '';
           }
        }
      }
    });

    // Cek validitas sebelum menyimpan ke storage (try-catch block seperti sebelumnya)
    try {
      if (!chrome.runtime.id) throw new Error("Invalid context");
    } catch (err) {
      isExtensionValid = false;
      throw new Error("Extension context invalidated before storage");
    }

    // Simpan jumlah terdeteksi
    try {
      chrome.storage.local.set({detectedCount: (detectedComments ? detectedComments.length : 0)}, function() {
        if (chrome.runtime.lastError) {
          console.error("Error saat menyimpan detectedCount:", chrome.runtime.lastError);
        }
      });
      // Jika dalam mode auto-remove, update juga removedCount karena komentar disembunyikan
      if (autoRemoveMode) {
        chrome.storage.local.set({removedCount: (detectedComments ? detectedComments.length : 0)}, function() {
          if (chrome.runtime.lastError) {
            console.error("Error saat menyimpan removedCount (auto-mode):", chrome.runtime.lastError);
          }
        });
      }
    } catch (err) {
      console.error("Gagal menyimpan count ke storage:", err); // Pesan error lebih generik
      if (err.message && err.message.includes("Extension context invalidated")) {
        isExtensionValid = false;
      }
    }
    
    console.log("Total komentar judol terdeteksi:", (detectedComments ? detectedComments.length : 0));
  } catch (err) {
    console.error("Error dalam scanForJudolComments:", err);
    if (err.message && err.message.includes("Extension context invalidated")) {
      isExtensionValid = false;
    }
  } finally {
    isScanning = false;
  }
  
  return (detectedComments ? detectedComments.length : 0);
}

// Fungsi untuk menghapus komentar judol
async function removeJudolComments() {
  // Cek apakah ekstensi valid
  if (!isExtensionValid) {
    console.log("Ekstensi tidak valid, abaikan penghapusan");
    return 0;
  }
  
  try {
    // Jika belum pernah scan, lakukan scan terlebih dahulu
    if (detectedComments.length === 0) {
      await scanForJudolComments(false);
    }
    
    console.log("Menghapus komentar judol, jumlah:", detectedComments.length); // Log untuk debugging
    
    // Hapus semua komentar yang terdeteksi
    detectedComments.forEach(comment => {
      comment.style.display = 'none';
    });
    
    // Simpan jumlah yang dihapus di storage dengan pemeriksaan error
    const removedCount = detectedComments.length;
    try {
      chrome.storage.local.set({removedCount: removedCount}, function() {
        if (chrome.runtime.lastError) {
          console.error("Error saat menyimpan removedCount:", chrome.runtime.lastError);
        }
      });
    } catch (err) {
      console.error("Gagal menyimpan removedCount:", err);
    }
    
    return removedCount;
  } catch (err) {
    console.error("Error dalam removeJudolComments:", err);
    // Tandai ekstensi sebagai tidak valid jika terjadi error
    if (err.message && err.message.includes("Extension context invalidated")) {
      isExtensionValid = false;
    }
    return 0;
  }
}

// Fungsi untuk mengembalikan komentar yang disembunyikan
function restoreHiddenComments() {
  try {
    detectedComments.forEach(comment => {
      // Hapus tampilan 'none' tapi tetap pertahankan border merah
      comment.style.display = '';
    });
  } catch (err) {
    console.error("Error dalam restoreHiddenComments:", err);
  }
}

// Fungsi untuk menunggu hingga bagian komentar dimuat
function waitForCommentSection() {
  return new Promise((resolve, reject) => {
    const maxTries = 15; // Kurangi dari 30 menjadi 15 untuk mengurangi kemungkinan konteks tidak valid
    let tries = 0;
    
    const checkForComments = () => {
      // Periksa validitas ekstensi dengan try-catch
      try {
        if (chrome.runtime.id) {
          isExtensionValid = true;
        } else {
          isExtensionValid = false;
          return reject(new Error("Extension context invalidated during waitForCommentSection"));
        }
      } catch (err) {
        isExtensionValid = false;
        return reject(new Error("Extension context invalidated during waitForCommentSection"));
      }
      
      const commentSection = document.querySelector('#comments');
      if (commentSection) {
        return resolve(commentSection);
      }
      
      tries++;
      if (tries >= maxTries) {
        return resolve(null); // Kembalikan null setelah batas percobaan
      }
      
      setTimeout(checkForComments, 500);
    };
    
    checkForComments();
  });
}

// Fungsi untuk pemindaian otomatis dengan interval
function startAutoScan() {
  console.log("Memulai sistem pemindaian otomatis, autoRemove:", autoRemove); // Log untuk debugging
  
  // Pemindaian pertama 3 detik setelah halaman dimuat
  setTimeout(() => {
    if (window.location.href.includes('youtube.com/watch')) {
      console.log("Memulai pemindaian awal..."); // Log untuk debugging
      scanForJudolComments(true);
    }
  }, 3000);
  
  // Pemindaian berkala setiap 8 detik untuk menangkap komentar baru
  setInterval(() => {
    if (window.location.href.includes('youtube.com/watch') && autoRemove) {
      console.log("Melakukan pemindaian berkala..."); // Log untuk debugging
      scanForJudolComments(true);
    }
  }, 8000);
  
  // Pemindaian tambahan ketika halaman di-scroll
  window.addEventListener('scroll', debounce(() => {
    if (window.location.href.includes('youtube.com/watch') && autoRemove) {
      console.log("Mendeteksi scroll, memindai komentar baru..."); // Log untuk debugging
      scanForJudolComments(true);
    }
  }, 1000));
}

// Jalankan pemindaian otomatis saat halaman dimuat
setTimeout(startAutoScan, 1000); // Delay sedikit untuk memastikan storage sudah dimuat

// Pantau perubahan pada URL untuk YouTube
let lastUrl = location.href;
const observer = new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    if (location.href.includes('youtube.com/watch')) {
      console.log("URL berubah, memulai pemindaian baru..."); // Log untuk debugging
      // Reset daftar komentar yang terdeteksi
      detectedComments = [];
      // Tunggu sebentar untuk memastikan komentar telah dimuat
      setTimeout(() => {
        scanForJudolComments(true);
      }, 3000);
    }
  }
});

observer.observe(document, {subtree: true, childList: true});

// Observer untuk mendeteksi perubahan di bagian komentar
function setupCommentsObserver() {
  const commentsSection = document.querySelector('ytd-comments');
  if (commentsSection) {
    console.log("Memasang observer pada bagian komentar"); // Log untuk debugging
    
    const commentsObserver = new MutationObserver(debounce(() => {
      if (autoRemove) {
        console.log("Perubahan terdeteksi di bagian komentar, memindai..."); // Log untuk debugging
        scanForJudolComments(true);
      }
    }, 1000));
    
    commentsObserver.observe(commentsSection, {
      childList: true,
      subtree: true
    });
  } else {
    // Jika bagian komentar belum ada, coba lagi nanti
    console.log("Bagian komentar belum dimuat, mencoba lagi dalam 2 detik..."); // Log untuk debugging
    setTimeout(setupCommentsObserver, 2000);
  }
}

// Pasang observer segera setelah content script dimuat
setTimeout(setupCommentsObserver, 2000);

// Fungsi debounce untuk membatasi seberapa sering fungsi dipanggil
function debounce(func, wait) {
  let timeout;
  return function() {
    const context = this;
    const args = arguments;
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      func.apply(context, args);
    }, wait);
  };
} 